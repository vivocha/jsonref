import * as meta from './meta';
import { unescape } from './utils';

const PREFIX_RE: RegExp = /^(0|[1-9][0-9]*?)([#]?)$/;
const INDEX_RE: RegExp = /-|0|[1-9][0-9]*/;

export function getPointer(obj: any): string {
  const p: string[] = [];
  let parent: any, current: any = obj;
  while (parent = meta.getMeta(current).parent) {
    const frag = meta.getKey(current);
    if (!frag) {
      throw new Error(`Failed to get key for ${JSON.stringify(current)}`);
    } else {
      p.push('' + frag);
      current = parent;
    }
  }
  return [''].concat(p.reverse()).join('/');
}
export function resolve(obj: any, path: string): any {
  if (typeof obj === 'undefined') {
    throw new TypeError('Bad object');
  } else if (typeof path !== 'string') {
    throw new TypeError('Bad path');
  } else if (!path) {
    return obj;
  }
  let current: any = obj;
  const parts: string[] = path.split('/');
  const prefix = parts.shift();

  if (prefix) {
    if (prefix.match(meta.LII_RE)) {
      current = meta.getById(current, `#${prefix}`);
    } else {
      const match = prefix.match(PREFIX_RE);
      if (!match) {
        throw new SyntaxError(`Bad prefix ${prefix}`);
      } else {
        let levels = parseInt(match[1]);
        while(levels--) {
          current = meta.getMeta(current).parent;
          if (!current) {
            throw new RangeError(`Invalid prefix "${match[1]}"`);
          }
        }
        if (match[2]) {
          return meta.getKey(current);
        }
      }
    }
  }
  while(parts.length) {
    if (current === null || typeof current !== 'object') {
      throw new TypeError(`Invalid type at path`);
    }
    const part = unescape((parts.shift() as string));
    if (Array.isArray(current)) {
      if (!part.match(INDEX_RE)) {
        throw new SyntaxError(`Invalid array index "${part}"`);
      } else if (part === '-') {
        throw new RangeError(`Index out of bounds "${part}"`);
      } else {
        const index = parseInt(part);
        if (index > current.length) {
          throw new RangeError(`Index out of bounds "${part}"`);
        } else {
          current = current[index];
        }
      }
    } else {
      current = current[part];
      if (typeof current === 'undefined') {
        throw new RangeError(`Cannot find property "${part}"`);
      }
    }
  }
  return current;
}
