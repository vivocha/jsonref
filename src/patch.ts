import * as meta from './meta';
import * as pointer from './pointer';

export interface JSONPatchOther {
  op: 'add' | 'replace' | 'test';
  path: string;
  value: any;
}
export interface JSONPatchRemove {
  op: 'remove';
  path: string;
}
export interface JSONPatchCopyMove {
  op: 'copy' | 'move';
  path: string;
  from: string;
}
export type JSONPatch = (JSONPatchOther | JSONPatchRemove | JSONPatchCopyMove)[];

/*
export function toDottedPath(path: string): string {
  return (path || '').split('/').slice(1).join('.');
}
*/

export function diff(src: any, dst: any, path: string = '/'): JSONPatch {
  let out: JSONPatch = [];

  if (src !== dst) {
    if (typeof src !== 'undefined' && typeof dst === 'undefined') {
      return [{ op: 'remove', path }];
    } else if (typeof src === 'undefined' && typeof dst !== 'undefined') {
      return [{ op: 'add', path, value: dst }];
    } else if (typeof src !== typeof dst || src === null || dst === null || typeof src !== 'object') {
      return [{ op: 'replace', path, value: dst }];
    } else if (Array.isArray(src) !== Array.isArray(dst)) {
      return [{ op: 'replace', path, value: dst }];
    } else if (Array.isArray(src)) {
      for (let i = 0, max = Math.min(src.length, dst.length); i < max; i++) {
        out = out.concat(diff(src[i], dst[i], `${path === '/' ? '' : path}/${i}`));
      }
      if (src.length > dst.length) {
        for (let i = dst.length; i < src.length; i++) {
          out.push({ op: 'remove', path: `${path === '/' ? '' : path}/${i}` });
        }
      } else if (src.length < dst.length) {
        for (let i = src.length; i < dst.length; i++) {
          out.push({ op: 'add', path: `${path === '/' ? '' : path}/-`, value: dst[i] });
        }
      }
    } else {
      const keys = new Set([...Object.keys(src), ...Object.keys(dst)]);
      for (let k of keys) {
        out = out.concat(diff(src[k], dst[k], `${path === '/' ? '' : path}/${k}`));
      }
    }
  }
  return out;
}

export function patch(obj: any, patch: JSONPatch): any {
  const out = meta.annotate(JSON.parse(JSON.stringify(obj)), { scope: 'jsonref:patch' });
  for (let p of patch) {
    const path = (p.path || '').split('/').slice(1);
    if (!path.length) {
      throw new Error('path cannot be empty');
    }
    const key = path.pop();
    const parent = path.length ? pointer.resolve(out, `/${path.join('/')}`) : out;
    if (typeof parent !== 'object') {
      throw new Error('parent is non-object');
    }
    switch (p.op) {
      case 'add':
        if (key === '-') {
          if (!Array.isArray(parent)) {
            throw new Error("cannot use '-' index on non-array");
          }
          parent.push(p.value);
        } else {
          if (typeof parent[key!] !== 'undefined') {
            throw new Error('cannot add, path exists');
          }
          parent[key!] = p.value;
        }
        break;
      case 'replace':
        if (key === '-') {
          throw new Error("cannot use '-' index in path of replace");
        }
        if (typeof parent[key!] === 'undefined') {
          throw new Error('cannot replace, path does not exist');
        }
        parent[key!] = p.value;
        break;
      case 'move':
        {
          const from = (p.from || '').split('/').slice(1);
          if (!from.length) {
            throw new Error('from path cannot be empty');
          }
          const fromKey = from.pop();
          if (fromKey === '-') {
            throw new Error("cannot use '-' index in from path of move");
          }
          const fromParent = from.length ? pointer.resolve(out, `/${from.join('/')}`) : out;
          if (typeof fromParent[fromKey!] === 'undefined') {
            throw new Error('cannot move, from path does not exist');
          }
          if (key === '-') {
            if (!Array.isArray(parent)) {
              throw new Error("cannot use '-' index on non-array");
            }
            parent.push(fromParent[fromKey!]);
          } else {
            parent[key!] = fromParent[fromKey!];
          }
          if (Array.isArray(fromParent)) {
            fromParent.splice(parseInt(fromKey!), 1);
          } else {
            delete fromParent[fromKey!];
          }
        }
        break;
      case 'remove':
        if (key === '-') {
          throw new Error("cannot use '-' index in path of remove");
        } else if (typeof parent[key!] === 'undefined') {
          throw new Error('cannot remove, path does not exist');
        }
        if (Array.isArray(parent)) {
          parent.splice(parseInt(key!), 1);
        } else {
          delete parent[key!];
        }
        break;
      case 'copy':
        {
          const from = (p.from || '').split('/').slice(1);
          if (!from.length) {
            throw new Error('from path cannot be empty');
          }
          const fromKey = from.pop();
          if (fromKey === '-') {
            throw new Error("cannot use '-' index in from path of copy");
          }
          const fromParent = from.length ? pointer.resolve(out, `/${from.join('/')}`) : out;
          if (typeof fromParent[fromKey!] === 'undefined') {
            throw new Error('cannot move, from path does not exist');
          }
          if (key === '-') {
            if (!Array.isArray(parent)) {
              throw new Error("cannot use '-' index on non-array");
            }
            parent.push(fromParent[fromKey!]);
          } else {
            parent[key!] = fromParent[fromKey!];
          }
        }
        break;
      case 'test':
        if (key === '-') {
          throw new Error("cannot use '-' index in path of test");
        }
        if (parent[key!] !== p.value) {
          throw new Error('test failed');
        }
        break;
    }
  }
  return JSON.parse(JSON.stringify(out));
}
