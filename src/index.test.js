var chai = require('chai')
  , spies = require('chai-spies')
  , chaiAsPromised = require('chai-as-promised')
  , should = chai.should()
  , jsonref = require('../dist/index')

chai.use(spies);
chai.use(chaiAsPromised);

describe('jsonref', function() {

  describe('resolveUri', function() {

    it('should resolve an empty path and an empty scope to a #', function() {
      jsonref.resolveUri().should.deep.equal({ url: '', hash: [ '#'] });
    });
    it('should resolve an empty path with a hash and no scope to a hash', function() {
      jsonref.resolveUri('#/a/b').should.deep.equal({ url: '', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with no trailing / and a hash and no scope', function() {
      jsonref.resolveUri('http://example.com/x/y/z#/a/b').should.deep.equal({ url: 'http://example.com/x/y/z', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with trailing / and a hash and no scope', function() {
      jsonref.resolveUri('http://example.com/x/y/z/#/a/b').should.deep.equal({ url: 'http://example.com/x/y/z/', hash: [ '#', 'a', 'b' ] });
    });
    it('should split hashes not starting with /', function() {
      jsonref.resolveUri('#a/b').should.deep.equal({ url: '', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with no leading /, a hash and a scope with no path', function() {
      jsonref.resolveUri('x/y/z/#/a/b', 'http://example.com').should.deep.equal({ url: 'http://example.com/x/y/z/', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with no leading /, a hash and a scope with no path', function() {
      jsonref.resolveUri('/x/y/z/#/a/b', 'http://example.com').should.deep.equal({ url: 'http://example.com/x/y/z/', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with no leading /, a hash and a scope with a path with no trailing /', function() {
      jsonref.resolveUri('y/z/#/a/b', 'http://example.com/x').should.deep.equal({ url: 'http://example.com/y/z/', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with no leading /, a hash and a scope with a path with trailing /', function() {
      jsonref.resolveUri('y/z/#/a/b', 'http://example.com/x/').should.deep.equal({ url: 'http://example.com/x/y/z/', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with leading /, a hash and a scope with a path with no trailing /', function() {
      jsonref.resolveUri('/y/z/#/a/b', 'http://example.com/x').should.deep.equal({ url: 'http://example.com/y/z/', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path with leading /, a hash and a scope with a path with trailing /', function() {
      jsonref.resolveUri('/y/z/#/a/b', 'http://example.com/x/').should.deep.equal({ url: 'http://example.com/y/z/', hash: [ '#', 'a', 'b' ] });
    });
    it('should resolve a path containing .. with a scope', function() {
      jsonref.resolveUri('../z/#/a/b', 'http://example.com/x/y/').should.deep.equal({ url: 'http://example.com/x/z/', hash: [ '#', 'a', 'b' ] });
    });

  });

  describe('normalizeUri', function() {

    it('should normalize a path with no hash and no scope', function() {
      jsonref.normalizeUri('/x/y').should.equal('/x/y#');
      jsonref.normalizeUri('/x/y/').should.equal('/x/y/#');
    });
    it('should normalize a path with no hash and no scope, omitting the #', function() {
      jsonref.normalizeUri('/x/y', null, true).should.equal('/x/y');
      jsonref.normalizeUri('/x/y/', null, true).should.equal('/x/y/');
    });
    it('should normalize a path with hash and no scope', function() {
      jsonref.normalizeUri('/x/y#/a/b').should.equal('/x/y#/a/b');
      jsonref.normalizeUri('/x/y#a/b').should.equal('/x/y#/a/b');
      jsonref.normalizeUri('/x/y#a/b', null, true).should.equal('/x/y#/a/b');
    });
    it('should normalize a path with hash and scope', function() {
      jsonref.normalizeUri('y#/a/b', 'http://example.com/x').should.equal('http://example.com/y#/a/b');
      jsonref.normalizeUri('y#/a/b', 'http://example.com/x/').should.equal('http://example.com/x/y#/a/b');
      jsonref.normalizeUri('/y#/a/b', 'http://example.com/x/').should.equal('http://example.com/y#/a/b');
      jsonref.normalizeUri('http://example.org/y#/a/b', 'http://example.com/x/').should.equal('http://example.org/y#/a/b');
    });

  });

  describe('pointer', function() {

    describe('read', function() {

      var data;

      beforeEach(function() {
        data = {
          a: true,
          b: 1,
          c: 'test',
          d: {
            e: false,
            f: {
              g: 1,
              h: [
                'elem0',
                'elem1',
                {
                  i: 5
                }
              ]
            }
          }
        };
      });

      it('should return undefined if called with no data', function() {
        should.not.exist(jsonref.pointer());
        should.not.exist(jsonref.pointer(undefined, '/a'));
      });
      it('should return undefined if called with no path', function() {
        should.not.exist(jsonref.pointer(data));
      });
      it('should return data if called with a bad path', function() {
        var d = jsonref.pointer(data, { x: 'a' });
        should.exist(d);
        d.should.equal(data);
      });
      it('should return first level values by string, with no leading /', function() {
        jsonref.pointer(data, 'a').should.equal(true);
        jsonref.pointer(data, 'b').should.equal(1);
        jsonref.pointer(data, 'c').should.equal('test');
        jsonref.pointer(data, 'd').should.be.a('object');
      });
      it('should return first level values by string, with leading /', function() {
        jsonref.pointer(data, '/a').should.equal(true);
        jsonref.pointer(data, '/b').should.equal(1);
        jsonref.pointer(data, '/c').should.equal('test');
        jsonref.pointer(data, '/d').should.be.a('object');
      });
      it('should return n-th level values by string', function() {
        jsonref.pointer(data, 'd/e').should.equal(false);
        jsonref.pointer(data, 'd/f').should.be.a('object');
        jsonref.pointer(data, 'd/f/g').should.equal(1);
        jsonref.pointer(data, 'd/f/h/1').should.equal('elem1');
        jsonref.pointer(data, 'd/f/h/2/i').should.equal(5);
      });
      it('should return n-th level values by array of strings', function() {
        jsonref.pointer(data, [ 'd', 'e' ]).should.equal(false);
        jsonref.pointer(data, [ 'd', 'f' ]).should.be.a('object');
        jsonref.pointer(data, [ 'd', 'f', 'g' ]).should.equal(1);
        jsonref.pointer(data, [ 'd', 'f', 'h', 1 ]).should.equal('elem1');
        jsonref.pointer(data, [ 'd', 'f', 'h', 2, 'i' ]).should.equal(5);
      });
      it('should return n-th level values by array of strings, ignoring leading # and empty strings', function() {
        jsonref.pointer(data, [ '#', 'd', 'e' ]).should.equal(false);
        jsonref.pointer(data, [ '', 'd', 'f', 'h', 1 ]).should.equal('elem1');
      });
      it('should not return values by string, with trailing /', function() {
        should.not.exist(jsonref.pointer(data, '/a/'));
        should.not.exist(jsonref.pointer(data, 'd/e/'));
        should.not.exist(jsonref.pointer(data, 'd/f/h/2/i/'));
      });
      it('should return the root object', function() {
        jsonref.pointer(data, '/').should.equal(data);
      });

    });

    describe('write', function() {

      var data;

      beforeEach(function() {
        data = {
          a: true,
          b: 1,
          c: 'test',
          d: {
            e: false,
            f: {
              g: 1,
              h: [
                'elem0',
                'elem1',
                {
                  i: 5
                }
              ]
            }
          }
        };
      });

      it('should change the value of existing properties', function() {
        jsonref.pointer(data, 'a', 10).should.equal(10);
        jsonref.pointer(data, '/b', true).should.equal(true);
        jsonref.pointer(data, '#/c', 'hi').should.equal('hi');
        jsonref.pointer(data, '/d/e', true).should.equal(true);
        jsonref.pointer(data, '/d/f/h/1', 'elemx').should.equal('elemx');
        data.should.deep.equal({
          a: 10,
          b: true,
          c: 'hi',
          d: {
            e: true,
            f: {
              g: 1,
              h: [
                'elem0',
                'elemx',
                {
                  i: 5
                }
              ]
            }
          }
        });
      });
      it('should add new properties', function() {
        jsonref.pointer(data, 'j', 100).should.equal(100);
        jsonref.pointer(data, '/k/l/m/n/2/z', 'test').should.equal('test');
        data.should.deep.equal({
          a: true,
          b: 1,
          c: 'test',
          d: {
            e: false,
            f: {
              g: 1,
              h: [
                'elem0',
                'elem1',
                {
                  i: 5
                }
              ]
            }
          },
          j: 100,
          k: {
            l: {
              m: {
                n: [
                  ,
                  ,
                  {
                    z: 'test'
                  }
                ]
              }
            }
          }
        });
      });
      it('should delete existing properties', function() {
        should.not.exist(jsonref.pointer(data, 'b', undefined));
        should.not.exist(jsonref.pointer(data, 'd/f/h', undefined));
        data.should.deep.equal({
          a: true,
          c: 'test',
          d: {
            e: false,
            f: {
              g: 1,
            }
          }
        });
      });
    });

  });

  describe('scope', function() {

    it('should return undefined when no scope is set', function() {
      should.not.exist(jsonref.scope(10));
      should.not.exist(jsonref.scope({ a: 5 }));
      should.not.exist(jsonref.scope(undefined));
    });
    it('should return the scope of the properties of parsed objects', function() {
      return jsonref.parse({
        a: 10,
        b: {
          c: 5
        }
      }, { scope: 'http://example.com/x/y/z/' }).then(function(data) {
        jsonref.scope(data).should.equal('http://example.com/x/y/z/#');
        jsonref.scope(data.b).should.equal('http://example.com/x/y/z/#/b');
      });
    });

  });

  describe('parse', function() {

    it('should leave an object with no refs unchanged', function() {
      return jsonref.parse({
        a: 10,
        b: {
          c: 5
        }
      }).then(function(data) {
        data.should.deep.equal({
          a: 10,
          b: {
            c: 5
          }
        });
      });
    });
    it('should fail is the passed argument is neither a url nor an object', function() {
      return jsonref.parse(1).should.be.rejectedWith(Error, /bad_data/);
    });
    it('should be able to parse a root level $ref', function() {
      var retriever = chai.spy(function() {
        return Promise.resolve({
          a: 100
        });
      });
      return jsonref.parse({
        $ref: 'http://example.com/test#/a'
      }, {
        retriever: retriever
      }).should.eventually.equal(100);
    });
    it('should be able to parse the same data more than once', function() {
      return jsonref.parse({
        a: 10,
        b: {
          $ref: '#/a'
        }
      }).then(function(data) {
        return jsonref.parse(data).should.eventually.equal(data);
      });
    });
    it('should fail is no retriever is passed and an external url is needed', function() {
      return jsonref.parse({
        a: 10,
        b: {
          $ref: 'http://example.com/test#/a'
        }
      }).should.be.rejectedWith(Error, /no_retriever/);
    });
    it('should not call the retriever if the requested scope matches the specified one', function() {
      return jsonref.parse({
        a: 10,
        b: {
          $ref: 'http://example.com/test#/a'
        }
      }, { scope: 'http://example.com/test' }).should.eventually.be.a('object').and.have.a.property('b').equal(10);
    });
    it('should call the retriever if the requested scope does not match the specified one', function() {
      var retriever = chai.spy(function() {
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
        retriever: retriever
      }).should.eventually.be.a('object').and.have.a.property('b').equal(100);
    });
    it('should call the retriever if data is a string', function() {
      var retriever = chai.spy(function() {
        return Promise.resolve({
          a: 200
        });
      });
      return jsonref.parse('aaaa', {
        retriever: retriever
      }).should.eventually.be.a('object').and.have.a.property('a').equal(200);
    });
    it('should turn refs into references to the original properties', function() {
      var data = {
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
      return jsonref.parse(data).then(function(data) {
        data.should.have.property('c').equal(data.a);
        data.should.have.property('d').equal(data.a.b);
        data.should.have.property('e').equal(data);
      });
    });
    it('should allow changing the value of deref\'d properties', function() {
      var data = {
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
      return jsonref.parse(data).then(function(data) {
        data.d = 5;
        data.a.b.should.equal(5);
      });
    });

  });

  describe('normalize', function() {

    it('should return a scalar unchanged', function() {
      jsonref.normalize(5).should.equal(5);
    });
    it('should leave an object with no ids unchanged', function() {
      jsonref.normalize({
        a: {
          b: 1
        },
        c: {
          $ref: 'a'
        }
      }).should.deep.equal({
        a: {
          b: 1
        },
        c: {
          $ref: 'a'
        }
      });
    });
    it('should normalize all the refs in an object, with no explicit scope', function() {
      jsonref.normalize({
        id: 'abc',
        a: {
          id: '/xyz/#1',
          b: {
            c: 10,
            d: {
              $ref: 'c'
            }
          }
        },
        e: {
          f: {
            $ref: 'a'
          }
        },
        g: {
          id: 'https://example.org/test',
          h: {
            i: 100
          },
          j: {
            $ref: 'h/i'
          }
        }
      }/*, 'https://example.com/s/t/u'*/).should.deep.equal({
        id: 'abc',
        a: {
          id: '/xyz/#1',
          b: {
            c: 10,
            d: {
              $ref: '/xyz/c'
            }
          }
        },
        e: {
          f: {
            $ref: 'a'
          }
        },
        g: {
          id: 'https://example.org/test',
          h: {
            i: 100
          },
          j: {
            $ref: 'https://example.org/h/i'
          }
        }
      });
    });
    it('should normalize all the ids in an object', function() {
      jsonref.normalize({
        id: 'abc',
        a: {
          id: '/xyz/#1',
          b: {
            c: 10,
            d: {
              $ref: 'c'
            }
          }
        },
        e: {
          f: {
            $ref: 'a'
          }
        },
        g: {
          id: 'https://example.org/test',
          h: {
            i: 100
          },
          j: {
            $ref: 'h/i'
          }
        }
      }, 'https://example.com/s/t/u').should.deep.equal({
        id: 'abc',
        a: {
          id: '/xyz/#1',
          b: {
            c: 10,
            d: {
              $ref: 'https://example.com/xyz/c'
            }
          }
        },
        e: {
          f: {
            $ref: 'https://example.com/s/t/a'
          }
        },
        g: {
          id: 'https://example.org/test',
          h: {
            i: 100
          },
          j: {
            $ref: 'https://example.org/h/i'
          }
        }
      });
    });

  });
});