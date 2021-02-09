import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { diff, patch } from '../../dist/patch';

chai.use(chaiAsPromised);
const should = chai.should();

describe('diff', function () {
  it('should diff a defined source with an undefined destination', function () {
    diff('aaa', undefined).should.deep.equal([{ op: 'remove', path: '/' }]);
  });
  it('should diff an undefined source with a defined destination', function () {
    diff(undefined, 'aaa').should.deep.equal([{ op: 'add', path: '/', value: 'aaa' }]);
  });
  it('should diff two different types', function () {
    diff(123, 'aaa').should.deep.equal([{ op: 'replace', path: '/', value: 'aaa' }]);
    diff(null, 'aaa').should.deep.equal([{ op: 'replace', path: '/', value: 'aaa' }]);
    diff('aaa', null).should.deep.equal([{ op: 'replace', path: '/', value: null }]);
    diff('aaa', {}).should.deep.equal([{ op: 'replace', path: '/', value: {} }]);
    diff({}, []).should.deep.equal([{ op: 'replace', path: '/', value: [] }]);
  });
  it('should diff two arrays', function () {
    diff([1, 2, 3], [1, 2, 3]).should.deep.equal([]);
    diff([1, 2, 3], [1, 2, 4]).should.deep.equal([{ op: 'replace', path: '/2', value: 4 }]);
    diff([1, 2, 3], [1, 2]).should.deep.equal([{ op: 'remove', path: '/2' }]);
    diff([1, 2, 3], [1, 3]).should.deep.equal([
      { op: 'replace', path: '/1', value: 3 },
      { op: 'remove', path: '/2' },
    ]);
    diff([1, 2], [1, 2, 3]).should.deep.equal([{ op: 'add', path: '/-', value: 3 }]);
    diff({ a: [1, 2, 3] }, { a: [1, 2] }).should.deep.equal([{ op: 'remove', path: '/a/2' }]);
    diff({ a: [1, 2] }, { a: [1, 2, 3] }).should.deep.equal([{ op: 'add', path: '/a/-', value: 3 }]);
  });
  it('should diff two objects', function () {
    diff({ a: 1 }, { a: 1 }).should.deep.equal([]);
    diff({ a: 1 }, { a: 2 }).should.deep.equal([{ op: 'replace', path: '/a', value: 2 }]);
    diff({ a: 1 }, { a: 1, b: 2 }).should.deep.equal([{ op: 'add', path: '/b', value: 2 }]);
    diff({ a: 1 }, { b: 2 }).should.deep.equal([
      { op: 'remove', path: '/a' },
      { op: 'add', path: '/b', value: 2 },
    ]);
    diff({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } }).should.deep.equal([{ op: 'replace', path: '/a/b/c', value: 2 }]);
  });
});

describe('patch', function () {
  describe('add', function () {
    it('should add a value', function () {
      patch({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]).should.deep.equal({ a: 1, b: 2 });
      patch({ a: 1, b: [1] }, [{ op: 'add', path: '/b/-', value: 2 }]).should.deep.equal({ a: 1, b: [1, 2] });
    });
    it('should fail with an empty path', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'add', path: '', value: 2 }]);
      }, 'path cannot be empty');
    });
    it('should fail if path exists', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'add', path: '/a', value: 2 }]);
      }, 'cannot add, path exists');
    });
    it('should fail if parent does not exist', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'add', path: '/b/c', value: 2 }]);
      }, 'Cannot find property "b"');
    });
    it('should fail trying to push on non-array', function () {
      should.Throw(function () {
        patch({ a: 1, b: { c: 1 } }, [{ op: 'add', path: '/b/-', value: 2 }]).should.deep.equal({ a: 1, b: [1, 2] });
      }, "cannot use '-' index on non-array");
    });
    it('should fail trying to add to non-object', function () {
      should.Throw(function () {
        patch({ a: 1, b: 1 }, [{ op: 'add', path: '/b/c', value: 2 }]);
      }, 'parent is non-object');
    });
  });
  describe('replace', function () {
    it('should replace a value', function () {
      patch({ a: 1 }, [{ op: 'replace', path: '/a', value: 2 }]).should.deep.equal({ a: 2 });
      patch({ a: 1, b: [1] }, [{ op: 'replace', path: '/b/0', value: 2 }]).should.deep.equal({ a: 1, b: [2] });
    });
    it('should fail with an empty path', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'replace', path: '', value: 2 }]);
      }, 'path cannot be empty');
    });
    it('should fail if path does not exist', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'replace', path: '/b', value: 2 }]);
      }, 'cannot replace, path does not exist');
    });
    it('should fail if parent does not exist', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'replace', path: '/b/c', value: 2 }]);
      }, 'Cannot find property "b"');
    });
    it("should fail with a '-' index", function () {
      should.Throw(function () {
        patch({ a: [1] }, [{ op: 'replace', path: '/a/-', value: 1 }]);
      }, "cannot use '-' index in path of replace");
    });
    it('should fail trying to replace to non-object', function () {
      should.Throw(function () {
        patch({ a: 1, b: 1 }, [{ op: 'replace', path: '/b/c', value: 2 }]);
      }, 'parent is non-object');
    });
  });
  describe('move', function () {
    it('should move a value', function () {
      patch({ a: 1 }, [{ op: 'move', from: '/a', path: '/b' }]).should.deep.equal({ b: 1 });
      patch({ a: 1, b: [1, 2, 3] }, [{ op: 'move', from: '/b/1', path: '/a' }]).should.deep.equal({ a: 2, b: [1, 3] });
      patch({ a: 1, b: [1, 2, 3] }, [{ op: 'move', from: '/a', path: '/b/-' }]).should.deep.equal({ b: [1, 2, 3, 1] });
    });
    it('should fail with an empty from path', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'move', from: '', path: '/a' }]);
      }, 'path cannot be empty');
    });
    it('should fail if from path does not exist', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'move', from: '/b', path: '/c' }]);
      }, 'cannot move, from path does not exist');
    });
    it("should fail with a '-' index", function () {
      should.Throw(function () {
        patch({ a: [1] }, [{ op: 'move', from: '/a/-', path: '/b' }]);
      }, "cannot use '-' index in from path of move");
    });
    it('should fail trying to push on non-array', function () {
      should.Throw(function () {
        patch({ a: { b: 1 }, b: { c: 1 } }, [{ op: 'move', from: '/b/c', path: '/a/-' }]);
      }, "cannot use '-' index on non-array");
    });
  });
  describe('remove', function () {
    it('should remove a value', function () {
      patch({ a: 1 }, [{ op: 'remove', path: '/a' }]).should.deep.equal({});
      patch({ a: 1, b: [1, 2, 3] }, [{ op: 'remove', path: '/b/1' }]).should.deep.equal({ a: 1, b: [1, 3] });
    });
    it('should fail with an empty from path', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'remove', path: '' }]);
      }, 'path cannot be empty');
    });
    it('should fail if from path does not exist', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'remove', path: '/b' }]);
      }, 'cannot remove, path does not exist');
    });
    it("should fail with a '-' index", function () {
      should.Throw(function () {
        patch({ a: [1] }, [{ op: 'remove', path: '/a/-' }]);
      }, "cannot use '-' index in path of remove");
    });
  });
  describe('copy', function () {
    it('should copy a value', function () {
      patch({ a: 1 }, [{ op: 'copy', from: '/a', path: '/b' }]).should.deep.equal({ a: 1, b: 1 });
      patch({ a: 1, b: [1, 2, 3] }, [{ op: 'copy', from: '/b/1', path: '/a' }]).should.deep.equal({ a: 2, b: [1, 2, 3] });
      patch({ a: 1, b: [1, 2, 3] }, [{ op: 'copy', from: '/a', path: '/b/-' }]).should.deep.equal({ a: 1, b: [1, 2, 3, 1] });
    });
    it('should fail with an empty from path', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'copy', from: '', path: '/a' }]);
      }, 'path cannot be empty');
    });
    it('should fail if from path does not exist', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'copy', from: '/b', path: '/c' }]);
      }, 'cannot move, from path does not exist');
    });
    it("should fail with a '-' index", function () {
      should.Throw(function () {
        patch({ a: [1] }, [{ op: 'copy', from: '/a/-', path: '/b' }]);
      }, "cannot use '-' index in from path of copy");
    });
    it('should fail trying to push on non-array', function () {
      should.Throw(function () {
        patch({ a: { b: 1 }, b: { c: 1 } }, [{ op: 'copy', from: '/b/c', path: '/a/-' }]);
      }, "cannot use '-' index on non-array");
    });
  });
  describe('test', function () {
    it('should test a (scalar) value', function () {
      patch({ a: 1 }, [{ op: 'test', path: '/a', value: 1 }]).should.deep.equal({ a: 1 });
      patch({ a: 1, b: [1, 2, 3] }, [{ op: 'test', path: '/b/1', value: 2 }]).should.deep.equal({ a: 1, b: [1, 2, 3] });
    });
    it('should fail with a (scalar) value differs', function () {
      should.Throw(function () {
        patch({ a: 1 }, [{ op: 'test', path: '/a', value: 2 }]);
      }, 'test failed');
      should.Throw(function () {
        patch({ a: 1, b: [1, 2, 3] }, [{ op: 'test', path: '/b/1', value: 4 }]);
      }, 'test failed');
    });
    it("should fail with a '-' index", function () {
      should.Throw(function () {
        patch({ a: [1] }, [{ op: 'test', path: '/a/-', value: 1 }]);
      }, "cannot use '-' index in path of test");
    });
  });
});
