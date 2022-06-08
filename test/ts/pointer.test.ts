import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as meta from '../../dist/meta.js';
import * as pointer from '../../dist/pointer.js';

chai.use(chaiAsPromised);
const should = chai.should();

describe('pointer', function () {
  describe('getPointer', function () {
    it('should throw if obj is not annotated', function () {
      (function () {
        pointer.getPointer({});
      }.should.throw(Error, /Not annotated/));
    });
    it('should throw if obj is not linked to its parent', function () {
      (function () {
        const data = meta.annotate(
          {
            a: {
              b: {
                c: 5,
              },
            },
          },
          { scope: 'http://example.com' }
        );
        const b = data.a.b;
        delete data.a.b;
        pointer.getPointer(b);
      }.should.throw(Error, /Failed to get key/));
    });
    it('should return the path of a top level object', function () {
      const data = meta.annotate({}, { scope: 'http://example.com' });
      pointer.getPointer(data).should.equal('');
    });
    it('should return the path of a n-level property', function () {
      const data = meta.annotate(
        {
          a: {
            b: {
              c: 5,
            },
          },
        },
        { scope: 'http://example.com' }
      );
      pointer.getPointer(data.a).should.equal('/a');
      pointer.getPointer(data.a.b).should.equal('/a/b');
    });
  });

  describe('resolve', function () {
    it('should throw if obj is undefined', function () {
      (function () {
        pointer.resolve(undefined, '');
      }.should.throw(TypeError, /Bad object/));
    });
    it('should throw if path is not a string', function () {
      (function () {
        pointer.resolve({}, 1 as any as string);
      }.should.throw(TypeError, /Bad path/));
    });
    it('should throw if path contains parts pointing to scalars', function () {
      (function () {
        pointer.resolve({ a: 5 }, '/a/b');
      }.should.throw(TypeError, /Invalid type at path/));
    });
    it('should throw if path contains parts pointing an uknown property', function () {
      (function () {
        pointer.resolve({ a: { b: 5 } }, '/a/c');
      }.should.throw(RangeError, /Cannot find property/));
    });
    it('should throw if an array is indexed with a bad index', function () {
      (function () {
        pointer.resolve({ a: ['x', 'y'] }, '/a/c');
      }.should.throw(SyntaxError, /Invalid array index/));
    });
    it('should throw if an array is indexed with a dash', function () {
      (function () {
        pointer.resolve({ a: ['x', 'y'] }, '/a/-');
      }.should.throw(RangeError, /Index out of bounds/));
    });
    it('should throw if an array is indexed with an index out of bounds', function () {
      (function () {
        pointer.resolve({ a: ['x', 'y'] }, '/a/4');
      }.should.throw(RangeError, /Index out of bounds/));
    });
    it('should return an array element', function () {
      pointer.resolve({ a: ['x', 'y'] }, '/a/1').should.equal('y');
    });
    it('should return an object property', function () {
      pointer.resolve({ a: { b: 5 } }, '/a/b').should.equal(5);
    });
    it('should return obj is path is an empty string', function () {
      const data = {};
      pointer.resolve(data, '').should.equal(data);
    });
    it('should conform with the examples in chapter 5 of RFC6901', function () {
      const data = {
        foo: ['bar', 'baz'],
        '': 0,
        'a/b': 1,
        'c%d': 2,
        'e^f': 3,
        'g|h': 4,
        'i\\j': 5,
        'k"l': 6,
        ' ': 7,
        'm~n': 8,
      };
      pointer.resolve(data, '').should.equal(data);
      pointer.resolve(data, '/foo').should.equal(data.foo);
      pointer.resolve(data, '/foo/0').should.equal('bar');
      pointer.resolve(data, '/').should.equal(0);
      pointer.resolve(data, '/a~1b').should.equal(1);
      pointer.resolve(data, '/c%d').should.equal(2);
      pointer.resolve(data, '/e^f').should.equal(3);
      pointer.resolve(data, '/g|h').should.equal(4);
      pointer.resolve(data, '/i\\j').should.equal(5);
      pointer.resolve(data, '/k"l').should.equal(6);
      pointer.resolve(data, '/ ').should.equal(7);
      pointer.resolve(data, '/m~0n').should.equal(8);
    });
  });

  describe('resolve (relative pointers)', function () {
    it('should throw if obj is not annotated', function () {
      (function () {
        pointer.resolve({}, '1');
      }.should.throw(Error, /Not annotated/));
    });
    it('should throw if the prefix is malformed', function () {
      (function () {
        pointer.resolve({}, '1a');
      }.should.throw(SyntaxError, /Bad prefix/));
    });
    it('should throw if the prefix out of bounds', function () {
      (function () {
        const data = meta.annotate(
          {
            a: {
              b: {
                $id: '#aaa',
                c: {
                  d: 5,
                },
              },
            },
          },
          { scope: 'http://example.com' }
        );
        pointer.resolve(data.a.b, '3');
      }.should.throw(RangeError, /Invalid prefix/));
    });
    it('should return a relative path', function () {
      const data = meta.annotate(
        {
          a: {
            b: {
              $id: '#aaa',
              c: {
                d: 5,
              },
            },
            e: {
              f: 6,
            },
          },
        },
        { scope: 'http://example.com' }
      );
      pointer.resolve(data.a.b.c, '2/e/f').should.equal(6);
    });
    it('should return the key of a relative path', function () {
      const data = meta.annotate(
        {
          a: {
            b: {
              $id: '#aaa',
              c: {
                d: 5,
              },
            },
          },
        },
        { scope: 'http://example.com' }
      );
      pointer.resolve(data.a.b.c, '2#').should.equal('a');
    });
  });

  describe('resolve (Location Independent Identifiers)', function () {
    it('should return a path with a LII', function () {
      const data = meta.annotate(
        {
          a: {
            b: {
              $id: '#aaa',
              c: {
                d: 5,
              },
            },
          },
        },
        { scope: 'http://example.com' }
      );
      pointer.resolve(data, 'aaa/c/d').should.equal(5);
    });
  });
});
