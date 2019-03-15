import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as meta from '../../dist/meta';

chai.use(chaiAsPromised);
const should = chai.should();

describe('meta', function() {

  describe('normalizeUri', function() {
    it('should throw if no url is passed', function() {
      (function() {
        meta.normalizeUri('');
      }).should.throw(TypeError, /Invalid URL/);
    });
    it('should throw if an invalid url is passed', function() {
      (function() {
        meta.normalizeUri('??a');
      }).should.throw(TypeError, /Invalid URL/);
    });
    it('should throw if a relative url is passed without a scope', function() {
      (function() {
        meta.normalizeUri('/a');
      }).should.throw(TypeError, /Invalid URL/);
    });
    it('should normalized a relative url', function() {
      meta.normalizeUri('/a', 'http://example.com').should.equal('http://example.com/a#');
    });
    it('should normalized an absolute url', function() {
      meta.normalizeUri('http://example.com').should.equal('http://example.com/#');
      meta.normalizeUri('http://example.com#aaa').should.equal('http://example.com/#aaa');
    });
  });

  describe('isRef', function() {
    it('should return false if obj is null', function() {
      meta.isRef(null).should.equal(false);
    });
    it('should return false if obj is not an object', function() {
      meta.isRef(1).should.equal(false);
    });
    it('should return false if obj is not ref', function() {
      meta.isRef({}).should.equal(false);
    });
    it('should return true if obj is ref', function() {
      meta.isRef({ $ref: 'a' }).should.equal(true);
    });
    it('should return true if obj is ref and has additional properties', function() {
      meta.isRef({ $ref: 'a', x: 1 }).should.equal(true);
    });
  });

  describe('isAnnotated', function() {
    it('should return false if obj is null', function() {
      meta.isAnnotated(null).should.equal(false);
    });
    it('should return false if obj is not an object', function() {
      meta.isAnnotated(1).should.equal(false);
    });
    it('should return false if obj is not annotated', function() {
      meta.isAnnotated({}).should.equal(false);
    });
    it('should return true if obj is annotated', function() {
      meta.isAnnotated(meta.annotate({ }, { scope: 'http://example.com' })).should.equal(true);
    });
  });

  describe('getMeta', function() {
    it('should throw if no obj is passed', function() {
      (function() {
        meta.getMeta(undefined);
      }).should.throw(Error, /Not annotated/);
    });
    it('should throw if obj is not annotated', function() {
      (function() {
        meta.getMeta({});
      }).should.throw(Error, /Not annotated/);
    });
    it('should return the metadata of an annotated object', function() {
      meta.getMeta(meta.annotate({}, { scope: 'http://example.com'})).registry.should.be.a('object');
    });
  });
  
  describe('getKey', function() {
    it('should throw if no obj is passed', function() {
      (function() {
        meta.getKey(undefined);
      }).should.throw(Error, /Not annotated/);
    });
    it('should throw if obj is not annotated', function() {
      (function() {
        meta.getKey({});
      }).should.throw(Error, /Not annotated/);
    });
    it('should return undefined for the root object', function() {
      should.not.exist(meta.getKey(meta.annotate({}, { scope: 'http://example.com'})));
    });
    it('should return the key, if object is a property of its parent', function() {
      const key = meta.getKey(meta.annotate({ a: { b: true }}, { scope: 'http://example.com'}).a);
      should.exist(key);
      (key as string).should.equal('a');
    });
    it('should return the index, if object is part of an array', function() {
      const key = meta.getKey(meta.annotate({ a: { b: [ { x: 1 }, { x: 2 } ] }}, { scope: 'http://example.com'}).a.b[1]);
      should.exist(key);
      (key as number).should.equal(1);
    });
    it('should return undefined if the object is member of the parent array', function() {
      const data = meta.annotate({ a: { b: [ { x: 1 }, { x: 2 } ] }}, { scope: 'http://example.com'});
      const elem = data.a.b.pop();
      const key = meta.getKey(elem);
      should.not.exist(key);
    });
  });

  describe('getById', function() {
    it('should throw if obj is null', function() {
      (function() {
        meta.getById(null, 'a');
      }).should.throw(TypeError, /Invalid object/);
    });
    it('should throw if obj is not annotated', function() {
      (function() {
        meta.getById({}, 'a');
      }).should.throw(Error, /Not annotated/);
    });
    it('should return undefined if id is not in the registry', function() {
      const data = meta.annotate({
        a: {
          b: {
            $id: 'a',
            c: 5
          }
        }
      }, { scope: 'http://example.com' });
      should.not.exist(meta.getById(data, 'b'));
    });
    it('should return a reference by id', function() {
      const data = meta.annotate({
        a: {
          b: {
            $id: 'a',
            c: 5
          }
        }
      }, { scope: 'http://example.com' });
      meta.getById(data, 'a').should.equal(data.a.b);
    });
  });

  describe('annotate', function() {
    it('should throw if obj is null', function() {
      (function() {
        meta.annotate(null, { scope: 'http://example.com' });
      }).should.throw(TypeError, /Invalid object/);
    });
    it('should throw if obj is already annotated', function() {
      (function() {
        const opts = { scope: 'http://example.com' };
        meta.annotate(meta.annotate({}, opts), opts);
      }).should.throw(Error, /Already annotated/);
    });
    it('should throw if an object has an empty $id', function() {
      (function() {
        meta.annotate({ a: { $id: '' } }, { scope: 'http://example.com' });
      }).should.throw(SyntaxError, /Invalid identifier/);
    });
    it('should throw if an object has $id === \'#\'', function() {
      (function() {
        meta.annotate({ a: { $id: '#' } }, { scope: 'http://example.com' });
      }).should.throw(SyntaxError, /Invalid identifier/);
    });
    it('should throw if an object has $id that contains a JSON Pointer', function() {
      (function() {
        meta.annotate({ a: { $id: '#/a' } }, { scope: 'http://example.com' });
      }).should.throw(SyntaxError, /Invalid identifier/);
    });
    it('should throw if an object has $id that contains a Relative JSON Pointer', function() {
      (function() {
        meta.annotate({ a: { $id: '#1/a' } }, { scope: 'http://example.com' });
      }).should.throw(SyntaxError, /Invalid identifier/);
    });
    it('should throw if an empty scope is passed', function() {
      (function() {
        meta.annotate({ a: { $id: '#1/a' } }, { scope: '' });
      }).should.throw(TypeError, /Invalid URL/);
    });
    it('should annotate :-)', function() {
      const obj = meta.annotate({
        a: {
          b: {
            $id: 'http://other.example.com/a',
            c: {
              $id: 'b'
            },
            d: {
              $ref: '#'
            }
          }
        },
        e: {
          $ref: '#/a/b'
        }
      }, { scope: 'http://example.com' });
      const rootMeta = meta.getMeta(obj);
      should.not.exist(rootMeta.parent);
      should.exist(rootMeta.scope);
      rootMeta.scope.should.equal('http://example.com/#');
      rootMeta.root.should.equal(obj);
      rootMeta.refs.size.should.equal(2);
      Object.keys(rootMeta.registry).length.should.equal(3);
      meta.getMeta(obj.a).parent.should.equal(obj);
      meta.getMeta(obj.a.b.d).parent.should.equal(obj.a.b);
      meta.getMeta(obj.a.b).root.should.equal(obj.a.b);
      meta.getMeta(obj.a.b.d).root.should.equal(obj.a.b);
    });
  });

  describe('missingRefs', function() {
    it('should throw if obj is not annotated', function() {
      (function() {
        meta.missingRefs({});
      }).should.throw(Error, /Not annotated/);
    });
    it('should return an empty array if not refs are missing', function() {
      const obj = meta.annotate({
        a: {
          b: {
            $id: 'http://other.example.com/a',
            d: {
              $ref: '#'
            }
          }
        },
        e: {
          $ref: '#/a/b'
        }
      }, { scope: 'http://example.com' });
      meta.missingRefs(obj).length.should.equal(0);
    });
    it('should return an array containing the missing refs', function() {
      const obj = meta.annotate({
        a: {
          $ref: 'a'
        },
        b: {
          $ref: 'http://other.example.com'
        },
        c: {
          $ref: '#'
        },
        d: {
          $ref: '#/b'
        }
      }, { scope: 'http://example.com' });
      meta.missingRefs(obj).should.deep.equal([
        'http://example.com/a#',
        'http://other.example.com/#'
      ]);
    });
  });

  describe('normalize', function() {
    it('should throw if obj is not annotated', function() {
      (function() {
        meta.normalize({ a: { $id: '#1/a' } });
      }).should.throw(Error, /Not annotated/);
    });
    it('should normalized $ids and $refs', function() {
      const data = meta.annotate({
        a: {
          $ref: '#'
        },
        b: {
          c: {
            $ref: '#/b'
          }
        },
        d: {
          $id: 'a'
        },
        e: {
          $id: '#a'
        }
      }, { scope: 'http://example.com' });
      const norma = meta.normalize(data);
      norma.should.equal(data);
      norma.a.$ref.should.equal('http://example.com/#');
      norma.b.c.$ref.should.equal('http://example.com/#/b');
      norma.d.$id.should.equal('http://example.com/a#');
      norma.e.$id.should.equal('http://example.com/#a');
    });
  });
});