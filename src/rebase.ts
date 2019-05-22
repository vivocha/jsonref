import { isRef } from './meta';

export interface Rebaser {
  (id: string, obj: any): any;
}

/**
 * Rebase JSON Schema $refs (only) to OpenAPI spec-related paths.
 * In particular, rebase:
 * <ext_schema_name>#/definitions/<schema_name> to #/components/schemas/<ext_schema_name>/definitions/<schema_name>
 * and
 * #/definitions/<schema_def_name> to #/components/schemas/<schema_name>/definitions/<schema_def_name>
 *
 * @export
 * @param {string} id - name of the schema
 * @param {*} obj - schema object
 * @param {Function} [rebaser]
 * @returns {*} a copy of the passed schema with rebased $refs.
 */
export function rebase(id: string, obj: any, rebaser?: Rebaser): any {
  // cyclic schema objects registry
  const parsedProps: string[] = [];
  let copy = JSON.parse(JSON.stringify(obj));
  try {
    (function findAndRebase(obj: any) {
      for (const key of Object.keys(obj)) {
        if (isRef(key) === true) {
          if (rebaser) {
            rebaser(id, obj);
          }
        }
        const prop = obj[key];
        if (prop && typeof prop === 'object') {
          if (!Array.isArray(prop)) {
            if (!parsedProps.find(p => p === prop)) {
              parsedProps.push(prop);
              findAndRebase(prop);
            }
          } else {
            // the property value is an array
            for (let i = 0; i < prop.length; i++) {
              findAndRebase(prop[i]);
            }
          }
        }
      }
    })(copy);
  } catch (error) {
    console.error('Error changing $ref, no rebasing performed', error);
    return obj;
  }
  // original schema is preserved.
  return copy;
}
