import * as chai from 'chai';
import { rebase, Rebaser, RebaserError } from './index.js';

const should = chai.should();

describe('rebasing refs', function () {
  describe('rebase ', function () {
    it('should return an unchanged obj if rebaser function is not passed', function () {
      const obj = {
        description: 'An object',
        type: 'object',
        required: ['id', 'labelId'],
        definitions: {
          defA: {
            type: 'object',
            required: ['type'],
            properties: {
              id: { $ref: 'global#/definitions/nonEmptyString' },
              type: { $ref: 'global#/definitions/nonEmptyString' },
              labelId: { $ref: 'global#/definitions/nonEmptyString' },
              format: { $ref: 'global#/definitions/nonEmptyString' },
            },
          },
          defB: {
            type: 'object',
            allOf: [
              {
                $ref: '#/definitions/defA',
              },
            ],
            oneOf: [
              {
                type: 'object',
                properties: {
                  format: {
                    enum: ['break'],
                  },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: 'global#/definitions/nonEmptyString' },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: '#/definitions/defA' },
                },
              },
            ],
            properties: {
              type: {
                enum: ['meta'],
              },
            },
          },
        },
        properties: {
          a: {
            allOf: [{ $ref: 'global#/definitions/extDef' }, { $ref: '#/definitions/defB' }],
          },
          b: {
            type: 'string',
          },
          c: {
            enum: ['form', 'dialog', 'bot'],
            default: 'form',
          },
          d: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
              ],
            },
          },
        },
      };
      const rebased = rebase('my_object', obj);
      rebased.should.deep.equal(obj);
    });
    it('should throw a RebaseError in case something goes wrong', function () {
      const obj = {
        description: 'An object',
        type: 'object',
        required: ['id', 'labelId'],
        definitions: {
          defA: {
            type: 'object',
            required: ['type'],
            properties: {
              id: { $ref: 'global#/definitions/nonEmptyString' },
              type: { $ref: 'global#/definitions/nonEmptyString' },
              labelId: { $ref: 'global#/definitions/nonEmptyString' },
              format: { $ref: 'global#/definitions/nonEmptyString' },
            },
          },
          defB: {
            type: 'object',
            allOf: [
              {
                $ref: '#/definitions/defA',
              },
            ],
            oneOf: [
              {
                type: 'object',
                properties: {
                  format: {
                    enum: ['break'],
                  },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: 'global#/definitions/nonEmptyString' },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: '#/definitions/defA' },
                },
              },
            ],
            properties: {
              type: {
                enum: ['meta'],
              },
            },
          },
        },
        properties: {
          a: {
            allOf: [{ $ref: 'global#/definitions/extDef' }, { $ref: '#/definitions/defB' }],
          },
          b: {
            type: 'string',
          },
          c: {
            enum: ['form', 'dialog', 'bot'],
            default: 'form',
          },
          d: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
              ],
            },
          },
        },
      };
      const rebaser: Rebaser = (id: string, obj: any) => {
        throw new Error('test error');
      };
      should.throw(() => rebase('my_object', obj, rebaser), RebaserError);
    });
    it('should return an obj with all $refs set to id#/b/c using a proper rebaser function', function () {
      const obj = {
        description: 'An object',
        type: 'object',
        required: ['id', 'labelId'],
        definitions: {
          defA: {
            type: 'object',
            required: ['type'],
            properties: {
              id: { $ref: 'global#/definitions/nonEmptyString' },
              type: { $ref: 'global#/definitions/nonEmptyString' },
              labelId: { $ref: 'global#/definitions/nonEmptyString' },
              format: { $ref: 'global#/definitions/nonEmptyString' },
            },
          },
          defB: {
            type: 'object',
            allOf: [
              {
                $ref: '#/definitions/defA',
              },
            ],
            oneOf: [
              {
                type: 'object',
                properties: {
                  format: {
                    enum: ['break'],
                  },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: 'global#/definitions/nonEmptyString' },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: '#/definitions/defA' },
                },
              },
            ],
            properties: {
              type: {
                enum: ['meta'],
              },
            },
          },
        },
        properties: {
          a: {
            allOf: [{ $ref: 'global#/definitions/extDef' }, { $ref: '#/definitions/defB' }],
          },
          b: {
            type: 'string',
          },
          c: {
            enum: ['form', 'dialog', 'bot'],
            default: 'form',
          },
          d: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
              ],
            },
          },
        },
      };
      const rebaser: Rebaser = (id: string, obj: any) => {
        obj.$ref = `${id}#/b/c`;
        return obj;
      };
      const rebased = rebase('my_object', obj, rebaser);
      should.not.exist(JSON.stringify(rebased).match(new RegExp('(.+)#/definitions/(.+)', 'g')));
      should.not.exist(JSON.stringify(rebased).match(new RegExp('#/definitions/(.+)', 'g')));
      rebased.definitions.defA.properties.id.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.type.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.labelId.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.format.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defB.allOf[0].$ref.should.equal('my_object#/b/c');
      rebased.definitions.defB.oneOf[1].properties.message.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defB.oneOf[2].properties.message.$ref.should.equal('my_object#/b/c');
      rebased.properties.a.allOf[0].$ref.should.equal('my_object#/b/c');
      rebased.properties.a.allOf[1].$ref.should.equal('my_object#/b/c');

      for (let s of rebased.properties.d.items.anyOf) {
        s.$ref.should.equal('my_object#/b/c');
      }
    });
    it('should return an obj with all $refs set to id#/b/c using a proper rebaser function in case of a JSON without arrays', function () {
      const obj = {
        description: 'An object',
        type: 'object',
        definitions: {
          defA: {
            type: 'object',
            properties: {
              id: { $ref: 'global#/definitions/nonEmptyString' },
              type: { $ref: 'global#/definitions/nonEmptyString' },
              labelId: { $ref: 'global#/definitions/nonEmptyString' },
              format: { $ref: 'global#/definitions/nonEmptyString' },
            },
          },
        },
      };
      const rebaser: Rebaser = (id: string, obj: any) => {
        obj.$ref = `${id}#/b/c`;
        return obj;
      };
      const rebased = rebase('my_object', obj, rebaser);
      should.not.exist(JSON.stringify(rebased).match(new RegExp('(.+)#/definitions/(.+)', 'g')));
      should.not.exist(JSON.stringify(rebased).match(new RegExp('#/definitions/(.+)', 'g')));
      rebased.definitions.defA.properties.id.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.type.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.labelId.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.format.$ref.should.equal('my_object#/b/c');
    });
    it('should return an obj with all $refs set to id#/b/c using a proper rebaser function in case cyclic links', function () {
      const obj = {
        description: 'An object',
        type: 'object',
        definitions: {
          defA: {
            type: 'object',
            properties: {
              id: { $ref: 'global#/definitions/nonEmptyString' },
              type: { $ref: 'global#/definitions/nonEmptyString' },
              labelId: { $ref: 'global#/definitions/nonEmptyString' },
              format: { $ref: 'global#/definitions/nonEmptyString' },
              self: this,
            },
          },
        },
      };
      const rebaser: Rebaser = (id: string, obj: any) => {
        obj.$ref = `${id}#/b/c`;
        return obj;
      };
      const rebased = rebase('my_object', obj, rebaser);
      rebased.definitions.defA.properties.id.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.type.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.labelId.$ref.should.equal('my_object#/b/c');
      rebased.definitions.defA.properties.format.$ref.should.equal('my_object#/b/c');
    });
    it('should return an obj with all $refs correctly set using a proper rebaser function', function () {
      const obj = {
        description: 'An object',
        type: 'object',
        required: ['id', 'labelId'],
        definitions: {
          defA: {
            type: 'object',
            required: ['type'],
            properties: {
              id: { $ref: 'global#/definitions/nonEmptyString' },
              type: { $ref: 'global#/definitions/nonEmptyString' },
              labelId: { $ref: 'global#/definitions/nonEmptyString' },
              format: { $ref: 'global#/definitions/nonEmptyString' },
            },
          },
          defB: {
            type: 'object',
            allOf: [
              {
                $ref: '#/definitions/defA',
              },
            ],
            oneOf: [
              {
                type: 'object',
                properties: {
                  format: {
                    enum: ['break'],
                  },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: 'global#/definitions/nonEmptyString' },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: '#/definitions/defA' },
                },
              },
            ],
            properties: {
              type: {
                enum: ['meta'],
              },
            },
          },
        },
        properties: {
          a: {
            allOf: [{ $ref: 'global#/definitions/extDef' }, { $ref: '#/definitions/defB' }],
          },
          b: {
            type: 'string',
          },
          c: {
            enum: ['form', 'dialog', 'bot'],
            default: 'form',
          },
          d: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
              ],
            },
          },
        },
      };
      const rebaser: Rebaser = (schemaName: string, obj: any) => {
        const otherRef = new RegExp('^(.+)#/definitions/(.+)', 'g');
        const selfRef = new RegExp('^#/definitions/(.+)', 'g');
        let rebasedRef = obj.$ref;
        if (obj.$ref.match(selfRef)) {
          rebasedRef = obj.$ref.replace(selfRef, `#/components/schemas/${schemaName}/definitions/$1`);
        } else if (obj.$ref.match(otherRef)) {
          rebasedRef = obj.$ref.replace(otherRef, '#/components/schemas/$1/definitions/$2');
        }
        obj.$ref = rebasedRef;
        return obj;
      };
      const rebased = rebase('my_schema', obj, rebaser);
      should.not.exist(JSON.stringify(rebased).match(new RegExp('(.+)#/definitions/(.+)', 'g')));
      should.not.exist(JSON.stringify(rebased).match(new RegExp('#/definitions/(.+)', 'g')));
      should.exist(JSON.stringify(rebased).match(new RegExp('#/components/schemas/(.+)', 'g')));
      rebased.definitions.defA.properties.id.$ref.should.equal('#/components/schemas/global/definitions/nonEmptyString');
      rebased.definitions.defA.properties.type.$ref.should.equal('#/components/schemas/global/definitions/nonEmptyString');
      rebased.definitions.defA.properties.labelId.$ref.should.equal('#/components/schemas/global/definitions/nonEmptyString');
      rebased.definitions.defA.properties.format.$ref.should.equal('#/components/schemas/global/definitions/nonEmptyString');

      rebased.definitions.defB.allOf[0].$ref.should.equal('#/components/schemas/my_schema/definitions/defA');
      rebased.definitions.defB.oneOf[1].properties.message.$ref.should.equal('#/components/schemas/global/definitions/nonEmptyString');
      rebased.definitions.defB.oneOf[2].properties.message.$ref.should.equal('#/components/schemas/my_schema/definitions/defA');

      rebased.properties.a.allOf[0].$ref.should.equal('#/components/schemas/global/definitions/extDef');
      rebased.properties.a.allOf[1].$ref.should.equal('#/components/schemas/my_schema/definitions/defB');

      for (let s of rebased.properties.d.items.anyOf) {
        s.$ref.should.equal('#/components/schemas/my_schema/definitions/defA');
      }
    });
    it('should return an obj with all $refs correctly set using a proper complex rebaser function', function () {
      const obj = {
        description: 'An object',
        type: 'object',
        required: ['id', 'labelId'],
        definitions: {
          defA: {
            type: 'object',
            required: ['type'],
            properties: {
              id: { $ref: 'global#/definitions/nonEmptyString' },
              type: { $ref: 'global#/properties/a' },
              labelId: { $ref: 'global#' },
              format: { $ref: 'another' },
            },
          },
          defB: {
            type: 'object',
            allOf: [
              {
                $ref: '#/properties/c',
              },
            ],
            oneOf: [
              {
                type: 'object',
                properties: {
                  format: {
                    enum: ['break'],
                  },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: 'global#/definitions/nonEmptyString' },
                },
              },
              {
                type: 'object',
                required: ['id'],
                properties: {
                  format: {
                    enum: ['message'],
                  },
                  message: { $ref: '#/definitions/defA' },
                },
              },
            ],
            properties: {
              type: {
                enum: ['meta'],
              },
            },
          },
        },
        properties: {
          a: {
            allOf: [{ $ref: 'global#/definitions/extDef' }, { $ref: '#/definitions/defB' }],
          },
          b: {
            type: 'string',
          },
          c: {
            enum: ['form', 'dialog', 'bot'],
            default: 'form',
          },
          d: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
                { $ref: '#/definitions/defA' },
              ],
            },
          },
        },
      };
      const rebaser: Rebaser = (schemaName: string, obj: any) => {
        const otherRef = new RegExp('^(.+)#/definitions/(.+)', 'g');
        const selfRef = new RegExp('^#/definitions/(.+)', 'g');
        const otherPropRef = new RegExp('^(.+)#/properties/(.+)', 'g');
        const selfPropRef = new RegExp('^#/properties/(.+)', 'g');
        const nameRef = new RegExp('^([^#]+[^#]+)$', 'g');
        const nameAndHashRef = new RegExp('^([^#]+)#+$', 'g');

        let rebasedRef = obj.$ref;
        if (obj.$ref.match(selfRef)) {
          rebasedRef = obj.$ref.replace(selfRef, `#/components/schemas/${schemaName}/definitions/$1`);
        } else if (obj.$ref.match(otherRef)) {
          rebasedRef = obj.$ref.replace(otherRef, '#/components/schemas/$1/definitions/$2');
        } else if (obj.$ref.match(otherPropRef)) {
          rebasedRef = obj.$ref.replace(otherPropRef, '#/components/schemas/$1/properties/$2');
        } else if (obj.$ref.match(selfPropRef)) {
          rebasedRef = obj.$ref.replace(selfPropRef, `#/components/schemas/${schemaName}/properties/$1`);
        } else if (obj.$ref.match(nameRef)) {
          rebasedRef = obj.$ref.replace(nameRef, '#/components/schemas/$1');
        } else if (obj.$ref.match(nameAndHashRef)) {
          rebasedRef = obj.$ref.replace(nameAndHashRef, '#/components/schemas/$1');
        }
        obj.$ref = rebasedRef;
        return obj;
      };
      const rebased = rebase('my_schema', obj, rebaser);
      should.not.exist(JSON.stringify(rebased).match(new RegExp('(.+)#/definitions/(.+)', 'g')));
      should.not.exist(JSON.stringify(rebased).match(new RegExp('#/definitions/(.+)', 'g')));
      should.exist(JSON.stringify(rebased).match(new RegExp('#/components/schemas/(.+)', 'g')));
      rebased.definitions.defA.properties.id.$ref.should.equal('#/components/schemas/global/definitions/nonEmptyString');
      rebased.definitions.defA.properties.type.$ref.should.equal('#/components/schemas/global/properties/a');
      rebased.definitions.defA.properties.labelId.$ref.should.equal('#/components/schemas/global');
      rebased.definitions.defA.properties.format.$ref.should.equal('#/components/schemas/another');

      rebased.definitions.defB.allOf[0].$ref.should.equal('#/components/schemas/my_schema/properties/c');
      rebased.definitions.defB.oneOf[1].properties.message.$ref.should.equal('#/components/schemas/global/definitions/nonEmptyString');
      rebased.definitions.defB.oneOf[2].properties.message.$ref.should.equal('#/components/schemas/my_schema/definitions/defA');

      rebased.properties.a.allOf[0].$ref.should.equal('#/components/schemas/global/definitions/extDef');
      rebased.properties.a.allOf[1].$ref.should.equal('#/components/schemas/my_schema/definitions/defB');

      for (let s of rebased.properties.d.items.anyOf) {
        s.$ref.should.equal('#/components/schemas/my_schema/definitions/defA');
      }
    });
  });
});
