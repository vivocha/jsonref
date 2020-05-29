import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as spies from 'chai-spies';
import * as jsonref from '../../dist/index';

chai.use(spies);
chai.use(chaiAsPromised);
const should = chai.should();

describe('jsonref', function() {
  
  describe('scope', function() {
    it('should return undefined if obj is not annotated', function() {
      should.not.exist(jsonref.scope({}));
    });
    it('should return the scope of the properties of parsed objects', function() {
      return jsonref.parse({
        a: 10,
        b: {
          c: 5
        }
      }, { scope: 'http://example.com/x/y/z/' }).then(function(data) {
        (jsonref.scope(data) as string).should.equal('http://example.com/x/y/z/#');
        (jsonref.scope(data.b) as string).should.equal('http://example.com/x/y/z/#/b');
      });
    });
  });

  describe('parse', function() {

    it('should throw if the passed argument is neither a url nor an object', function() {
      return jsonref.parse(1, { scope: 'http://example.com' }).should.be.rejectedWith(TypeError, /Bad data/);
    });
    it('should throw if a scope is not passed', function() {
      return jsonref.parse({}, {} as jsonref.ParseOptions).should.be.rejectedWith(Error, /No scope/);
    });
    it('should throw if an invalid scope is passed', function() {
      return jsonref.parse({}, { scope: 'aaa'} ).should.be.rejectedWith(TypeError, /Invalid URL/);
    });
    it('should throw if a url is passed and a retriever is not', function() {
      return jsonref.parse('http://example.com', { scope: 'http://example.com' }).should.be.rejectedWith(Error, /No retriever/);
    });
    it('should throw if an invalid url is passed', function() {
      return jsonref.parse('aaaa', { scope: 'http://example.com', retriever: async () => {} }).should.be.rejectedWith(TypeError, /Invalid URL/);
    });
    it('should leave an object with no refs unchanged', function() {
      return jsonref.parse({
        a: 10,
        b: {
          c: 5
        }
      }, { scope: 'http://example.com' }).then(function(data) {
        data.should.deep.equal({
          a: 10,
          b: {
            c: 5
          }
        });
      });
    });
    it('should be able to parse a root level $ref', function() {
      let retriever = chai.spy(function() {
        return Promise.resolve({
          a: 100
        });
      });
      return jsonref.parse({
        $ref: 'http://example.com/test#/a'
      }, {
        scope: 'http://example.com',
        retriever
      }).should.eventually.equal(100);
    });
    it('should be able to parse the same data more than once', async function() {
      const opts = {
        scope: 'http://example.com'
      };
      const data = {
        a: 10,
        b: {
          $ref: '#/a'
        },
        c: {
          d: {
            e: true,
            f: {
              $ref: '#/c/d/e'
            }
          }
        }
      };
      const outerData = {
        data,
        ref: { $ref: '#/data/a' }
      };
      debugger;
      await jsonref.parse(data, opts);
      await jsonref.parse(outerData, opts).should.eventually.equal(outerData);
      return jsonref.parse(outerData, opts).should.eventually.equal(outerData);
    });
    it('should not call the retriever if the requested scope matches the specified one', function() {
      return jsonref.parse({
        a: 10,
        b: {
          $ref: 'http://example.com/test#/a'
        }
      }, { scope: 'http://example.com/test' }).should.eventually.be.a('object').and.have.property('b').equal(10);
    });
    it('should call the retriever if the requested scope does not match the specified one', function() {
      let retriever = chai.spy(function() {
        return Promise.resolve({
          a: 100
        });
      });
      return jsonref.parse({
        a: 10,
        b: {
          $ref: 'http://example.com/test#/a'
        },
        c: {
          id: 'xyz'
        }
      }, {
        scope: 'http://example.com/abc',
        retriever
      }).should.eventually.be.a('object').and.have.property('b').equal(100);
    });
    it('should call the retriever if data is a string', function() {
      let retriever = chai.spy(function() {
        return Promise.resolve({
          a: 200
        });
      });
      return jsonref.parse('http://example.com/aaaa', {
        scope: 'http://example.com/aaaa',
        retriever: retriever as jsonref.Retriever
      }).should.eventually.be.a('object').and.have.property('a').equal(200);
    });
    it('should store the retrieve data in the registry, if url and scope don\'t match', async function() {
      let retriever = chai.spy(function() {
        return Promise.resolve({
          a: 200
        });
      });
      const opts: jsonref.ParseOptions = {
        scope: 'http://example.com/bbbb',
        retriever: retriever as jsonref.Retriever
      }
      const data = await jsonref.parse('http://example.com/aaaa', opts);
      should.exist(opts.registry);
      (opts.registry as any).should.have.property('http://example.com/aaaa#');
    });
    it('should turn refs into references to the original properties', function() {
      let data = {
        a: {
          b: 10
        },
        c: {
          $ref: '#/a'
        },
        d: {
          $ref: '#/a/b'
        },
        e: {
          $ref: '#'
        }
      };
      return jsonref.parse(data, { scope: 'http://example.com' }).then(function(parsed) {
        parsed.c.should.equal(data.a);
        parsed.d.should.equal(data.a.b);
        parsed.e.should.equal(data);
      });
    });
    it('should allow changing the value of deref\'d properties', function() {
      let data = {
        a: {
          b: 10
        },
        c: {
          $ref: '#/a'
        },
        d: {
          $ref: '#/a/b'
        },
        e: {
          $ref: '#'
        }
      };
      return jsonref.parse(data, { scope: 'http://example.com' }).then(function(data) {
        data.c.b = 5;
        data.a.b.should.equal(5);
      });
    });
    it('should render as JSON as the original object', function() {
      let data = {
        a: {
          b: 10
        },
        c: {
          $ref: '#/a'
        },
        d: {
          $ref: '#/a/b'
        },
        e: {
          $ref: '#'
        }
      };
      let origJSON = JSON.stringify(data);
      return jsonref.parse(data, { scope: 'http://example.com' }).then(function(data) {
        data.e.a.b.should.equal(10);
        JSON.stringify(data).should.equal(origJSON);
      });
    });
    it('should throw if a referenced url cannot be downloaded (because the retriever is not available)', function() {
      return jsonref.parse({
        a: {
          $ref: 'http://other.example.com'
        }
      }, {
        scope: 'http://example.com'
      }).should.be.rejectedWith(Error, /No retriever/);
    });
    it('should throw if a referenced url cannot be downloaded (retriever error)', async function() {
      const err: any = await jsonref.parse({
        a: {
          $ref: 'http://other.example.com'
        }
      }, {
        scope: 'http://example.com', retriever: () => { throw new Error('failed') }
      }).should.be.rejectedWith(jsonref.ParserError, 'retriever');
      err.errors.length.should.equal(1);
      err.errors[0].message.should.equal('http://other.example.com/#')
    });

  });

  describe('getMeta', function() {
    it('should throw if no obj is passed', function() {
      (function() {
        jsonref.getMeta(undefined);
      }).should.throw(Error, /Not annotated/);
    });
    it('should throw if obj is not annotated', function() {
      (function() {
        jsonref.getMeta({});
      }).should.throw(Error, /Not annotated/);
    });
  });

  describe('isAnnotated', function() {
    it('should return false if obj is null', function() {
      jsonref.isAnnotated(null).should.equal(false);
    });
    it('should return false if obj is not an object', function() {
      jsonref.isAnnotated(1).should.equal(false);
    });
    it('should return false if obj is not annotated', function() {
      jsonref.isAnnotated({}).should.equal(false);
    });
  });

  describe('isRef', function() {
    it('should return false if obj is null', function() {
      jsonref.isRef(null).should.equal(false);
    });
    it('should return false if obj is not an object', function() {
      jsonref.isRef(1).should.equal(false);
    });
    it('should return false if obj is not ref', function() {
      jsonref.isRef({}).should.equal(false);
    });
    it('should return true if obj is ref', function() {
      jsonref.isRef({ $ref: 'a' }).should.equal(true);
    });
    it('should return true if obj is ref and has additional properties', function() {
      jsonref.isRef({ $ref: 'a', x: 1 }).should.equal(true);
    });
  });

  describe('normalize', function() {
    it('should throw if obj is not annotated', function() {
      (function() {
        jsonref.normalize({ a: { $id: '#1/a' } });
      }).should.throw(Error, /Not annotated/);
    });
  });

  describe('normalizeUri', function() {
    it('should throw if no url is passed', function() {
      (function() {
        jsonref.normalizeUri('');
      }).should.throw(TypeError, /Invalid URL/);
    });
    it('should throw if an invalid url is passed', function() {
      (function() {
        jsonref.normalizeUri('??a');
      }).should.throw(TypeError, /Invalid URL/);
    });
    it('should throw if a relative url is passed without a scope', function() {
      (function() {
        jsonref.normalizeUri('/a');
      }).should.throw(TypeError, /Invalid URL/);
    });
    it('should normalized a relative url', function() {
      jsonref.normalizeUri('/a', 'http://example.com').should.equal('http://example.com/a#');
    });
    it('should normalized an absolute url', function() {
      jsonref.normalizeUri('http://example.com').should.equal('http://example.com/#');
      jsonref.normalizeUri('http://example.com#aaa').should.equal('http://example.com/#aaa');
    });
    it('should append # if the normalized url hasn\'t', function() {
      jsonref.normalizeUri('http://super-mario.world/a/b').should.equal('http://super-mario.world/a/b#');
    });
  });

  describe('Pointer', function() {
    it('should throw if obj is undefined', function() {
      (function() {
        jsonref.pointer(undefined, '');
      }).should.throw(TypeError, /Bad object/);
    });
    it('should throw if path is not a string', function() {
      (function() {
        jsonref.pointer({}, 1 as any as string);
      }).should.throw(TypeError, /Bad path/);
    });
    it('should throw if path contains parts pointing to scalars', function() {
      (function() {
        jsonref.pointer({ a: 5 }, '/a/b');
      }).should.throw(TypeError, /Invalid type at path/);
    });
    it('should throw if path contains parts pointing an uknown property', function() {
      (function() {
        jsonref.pointer({ a: { b: 5 } }, '/a/c');
      }).should.throw(RangeError, /Cannot find property/);
    });
    it('should throw if an array is indexed with a bad index', function() {
      (function() {
        jsonref.pointer({ a: [ 'x', 'y' ] }, '/a/c');
      }).should.throw(SyntaxError, /Invalid array index/);
    });
    it('should throw if an array is indexed with a dash', function() {
      (function() {
        jsonref.pointer({ a: [ 'x', 'y' ] }, '/a/-');
      }).should.throw(RangeError, /Index out of bounds/);
    });
    it('should throw if an array is indexed with an index out of bounds', function() {
      (function() {
        jsonref.pointer({ a: [ 'x', 'y' ] }, '/a/4');
      }).should.throw(RangeError, /Index out of bounds/);
    });
    it('should return an array element', function() {
      jsonref.pointer({ a: [ 'x', 'y' ] }, '/a/1').should.equal('y');
    });
    it('should return an object property', function() {
      jsonref.pointer({ a: { b: 5 } }, '/a/b').should.equal(5);
    });
    it('should return obj is path is an empty string', function() {
      const data = {};
      jsonref.pointer(data, '').should.equal(data);
    });
    it('should conform with the examples in chapter 5 of RFC6901', function() {
      const data = {
        "foo": [ "bar", "baz" ],
        "": 0,
        "a/b": 1,
        "c%d": 2,
        "e^f": 3,
        "g|h": 4,
        "i\\j": 5,
        "k\"l": 6,
        " ": 7,
        "m~n": 8
      };
      jsonref.pointer(data, "").should.equal(data);
      jsonref.pointer(data, "/foo").should.equal(data.foo);
      jsonref.pointer(data, "/foo/0").should.equal("bar");
      jsonref.pointer(data, "/").should.equal(0);
      jsonref.pointer(data, "/a~1b").should.equal(1);
      jsonref.pointer(data, "/c%d").should.equal(2);
      jsonref.pointer(data, "/e^f").should.equal(3);
      jsonref.pointer(data, "/g|h").should.equal(4);
      jsonref.pointer(data, "/i\\j").should.equal(5);
      jsonref.pointer(data, "/k\"l").should.equal(6);
      jsonref.pointer(data, "/ ").should.equal(7);
      jsonref.pointer(data, "/m~0n").should.equal(8);
    });
  });

});
