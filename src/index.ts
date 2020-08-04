import { ParserError, RetrieverError } from './errors';
import * as meta from './meta';
import { resolve as refResolver } from './ref';

export * from './errors';
export { getMeta, isAnnotated, isRef, Meta, normalize, normalizeUri, Registry } from './meta';
export * from './patch';
export { resolve as pointer } from './pointer';
export * from './rebase';

export type Retriever = (url: string) => Promise<any>;

export interface ParseOptions extends meta.Options {
  retriever?: Retriever;
}

export function scope(data: any): string | undefined {
  if (meta.isAnnotated(data)) {
    return meta.getMeta(data).scope;
  }
}

export async function parse(dataOrUri: any, opts: ParseOptions): Promise<any> {
  let obj: any;

  if (!opts || !opts.scope) {
    throw new Error('No scope');
  }
  if (typeof dataOrUri === 'string') {
    if (!opts.retriever) {
      throw new Error('No retriever');
    }
    const uri = new URL(dataOrUri).toString();
    obj = await opts.retriever(uri);
    if (!opts.registry) {
      opts.registry = {};
    }
    if (uri !== opts.scope) {
      opts.registry[meta.normalizeUri(uri)] = obj;
    }
  } else if (dataOrUri === null || typeof dataOrUri !== 'object') {
    throw new TypeError('Bad data');
  } else {
    obj = dataOrUri;
  }

  if (meta.isAnnotated(obj)) {
    return obj;
  } else {
    meta.annotate(obj, opts);

    if (meta.getMeta(obj).refs.size > 0) {
      const missingRefs = meta.missingRefs(obj);

      if (missingRefs.length) {
        if (!opts.retriever) {
          throw new Error('No retriever');
        }
        const registry = meta.getMeta(obj).registry;
        const errors: RetrieverError[] = [];
        for (let r of missingRefs) {
          try {
            registry[r] = await opts.retriever(r);
          } catch (e) {
            errors.push(new RetrieverError(r, e));
          }
        }
        if (errors.length) {
          throw new ParserError(meta.getMeta(obj).scope, 'retriever', errors);
        }
      }

      return refResolver(obj, opts);
    } else {
      return obj;
    }
  }
}
