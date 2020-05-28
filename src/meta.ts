import { escape } from './utils';

export interface Registry {
  [uri: string]: any;
}

export interface Options {
  scope: string;
  registry?: Registry;
  refs?: Set<string>;
}

export interface Meta {
  registry: Registry;
  refs: Set<string>;
  scope: string;
  root: any;
  parent?: any;
  derefd?: boolean;
}

const __meta = Symbol();

export const LII_RE: RegExp = /^[a-zA-Z][a-zA-Z0-9\.\-_:]*$/; // Location-independent identifier, JSON Schema draft 7, par. 8.2.3

export function normalizeUri(input: string, scope?: string): string {
  const uri = new URL(input, scope);
  const out = uri.toString();
  return out + (!uri.hash && out[out.length-1] !== '#' ? '#' : '');
}
export function isRef(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && typeof obj.$ref === 'string';
}
export function isAnnotated(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && typeof obj[__meta] === 'object';
}
export function isDerefd(obj: any): boolean {
  return isAnnotated(obj) && obj[__meta].derefd === true;
}
export function getMeta(obj: any): Meta {
  if (!isAnnotated(obj)) {
    throw new Error('Not annotated');
  }
  return obj[__meta];
}
export function getKey(obj: any): string | number | undefined {
  const parent = getMeta(obj).parent;
  if (typeof parent === 'undefined') {
    return undefined;
  } else if (Array.isArray(parent)) {
    for (let i = 0; i < parent.length; i++) {
      if (parent[i] === obj) {
        return i;
      }
    }
    return undefined;
  } else {
    return Object.keys(parent).find(k => parent[k] === obj);
  }
}
export function getById(obj: any, id: string): any {
  if (obj === null || typeof obj !== 'object') {
    throw new TypeError('Invalid object');
  }
  const meta = getMeta(obj);
  return meta.registry[normalizeUri(id, meta.scope)];
}
export function annotate(obj: any, options: Options): any {
  if (obj === null || typeof obj !== 'object') {
    throw new TypeError('Invalid object');
  } else if (isAnnotated(obj)) {
    throw new Error('Already annotated');
  }
  obj[__meta] = {
    registry: options.registry || {},
    refs: options.refs || new Set(),
    root: obj
  } as Registry;
  obj[__meta].registry[normalizeUri(options.scope)] = obj;
  return (function _annotate(obj: any, scope: string): any {
    if (isRef(obj)) {
      const uri = new URL(obj.$ref, scope);
      uri.hash = '#';
      getMeta(obj).refs.add(uri.toString());
      obj[__meta].scope = normalizeUri(scope);
    } else {
      if (typeof obj.$id === 'string') {
        if (!obj.$id || obj.$id === '#') {
          throw new SyntaxError(`Invalid identifier ${obj.$id}`);
        }
        const id = new URL(obj.$id, scope);
        if (id.hash) {
          if (!id.hash.substr(1).match(LII_RE)) {
            throw new SyntaxError(`Invalid identifier ${obj.$id}`);
          }
        } else {
          id.hash = '#';
        }
        obj[__meta].scope = id.toString();
        obj[__meta].registry[obj[__meta].scope] = obj;
        obj[__meta].root = obj;
      } else {
        obj[__meta].scope = normalizeUri(scope);
      }
      const keys = Object.keys(obj);
      for (let key of keys) {
        const next = obj[key];
        if (next !== null && typeof next === 'object' && !isAnnotated(next)) {
          const meta = getMeta(obj);
          next[__meta] = {
            registry: meta.registry,
            refs: meta.refs,
            parent: obj,
            root: meta.root
          };
          _annotate(next, `${meta.scope}/${escape(key)}`);
        }
      }
    }
    return obj;
  })(obj, options.scope);
}
export function missingRefs(obj: any): string[] {
  const meta = getMeta(obj);
  const known = new Set(Object.keys(meta.registry));
  return [...meta.refs].filter(r => !known.has(r));
}
export function normalize(obj: any): any {
  if (!isAnnotated(obj)) {
    throw new Error('Not annotated');
  }
  const meta = getMeta(obj);
  if (typeof obj.$id === 'string') {
    obj.$id = normalizeUri(obj.$id, meta.scope);
  }
  const keys = Object.keys(obj);
  for (let key of keys) {
    const o = obj[key];
    if (o !== null && typeof o === 'object') {
      if (isRef(o)) {
        o.$ref = normalizeUri(o.$ref, meta.scope);
      } else {
        normalize(o);
      }
    }
  }
  return obj;
}
