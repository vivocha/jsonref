import { RebaserError } from './errors';

export interface Rebaser {
  (id: string, obj: any): any;
}

/**
 * Rebase JSON $refs properties (only) as specified by the rebase function.
 * It modifies the passed object.
 *
 * @param {string} id - id of the JSON (e.g., name of the schema in case of a JSON schema)
 * @param {*} obj - the JSON object
 * @param {Function} rebaser - the function which changes refs values as required by the specific application
 * @throws error - in case of error rebasing the object
 * @returns {*} a copy of the passed JSON object with rebased $refs, in case of success.
 */
export function rebase(id: string, obj: any, rebaser?: Rebaser): any {
  // visited objects properties registry
  const parsedProps: any[] = [];
  try {
    (function findAndRebase(obj: any) {
      for (const key of Object.keys(obj)) {
        if (key === '$ref') {
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
    })(obj);
  } catch (error) {
    throw new RebaserError('rebase', 'error', [error]);
  }
  return obj;
}
