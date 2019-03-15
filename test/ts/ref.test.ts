import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as ref from '../../dist/ref';

chai.use(chaiAsPromised);
const should = chai.should();

describe('ref', function() {

  describe('resolve', function() {
    it('should return null if obj is null', function() {
      should.equal(ref.resolve(null, { scope: 'http://example.com'}), null);
    });
    it('should return obj if obj is not an object', function() {
      ref.resolve(5, { scope: 'http://example.com'}).should.equal(5);
    });
    it('should throw if a ref is not in the registry', function() {
      (function() {
        ref.resolve({
          $ref: 'http://other.example.com'
        }, { scope: 'http://example.com' });
      }).should.throw(Error, /Reference not in registry/);
    });
    it('should resolve local refs', function() {
      const data = ref.resolve({
        a: {
          b: {
            $ref: '#'
          },
          c: {
            $ref: '#1/b'
          },
          d: {
            $ref: '#/e'
          }
        },
        e: {
          $id: 'other',
          f: {
            g: {
              $ref: 'http://example.com/#/a'
            }
          }
        },
        h: {
          $ref: 'other#/f'
        }
      }, { scope: 'http://example.com' });
      data.a.b.should.equal(data);
      data.a.c.should.equal(data);
      data.a.d.should.equal(data.e);
      data.e.f.g.should.equal(data.a);
      data.h.should.equal(data.e.f);
    });
    it.skip('should be serialized with the original $refs intact', function() {
      const data = ref.resolve({
        a: {
          b: {
            $ref: '#'
          }
        }
      }, { scope: 'http://example.com' });
      JSON.parse(JSON.stringify(data)).should.deep.equal({
        a: {
          b: {
            $ref: '#'
          }
        }
      });
    });
  });

});