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
    it('should be able to parse the same data more than once', function() {
      const opts = {
        scope: 'http://example.com'
      };
      return jsonref.parse({
        a: 10,
        b: {
          $ref: '#/a'
        }
      }, opts).then(function(data) {
        return jsonref.parse(data, opts).should.eventually.equal(data);
      });
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
    it('should throw if a referenced url cannot be downloaded (retriever error)', function() {
      return jsonref.parse({
        a: {
          $ref: 'http://other.example.com'
        }
      }, {
        scope: 'http://example.com', retriever: () => { throw new Error('failed') }
      }).should.be.rejectedWith(Error, /failed/);
    });

  });
});
