import * as url from 'url';

var __scope = Symbol();

function isRef(obj:any):boolean {
  return typeof obj === 'object' && typeof obj.$ref === 'string' && Object.keys(obj).length === 1;
}

export interface ResolvedUri {
  url:string;
  hash:string[];
}
export type Retriever = (url:string)=>Promise<any>;
export interface ParseOptions {
  scope?:string;
  store?:{
    [uri:string]:any
  };
  retriever?:Retriever;
}

export function resolveUri(path:string, scope?:string):ResolvedUri {
  var resolvedPath = url.resolve(scope || '', path || '');
  var parsedPath = url.parse(resolvedPath);
  var hash = parsedPath.hash || '';
  delete parsedPath.hash;
  if (hash) {
    hash = hash.substr(1);
    if (hash[0] === '/') hash = hash.substr(1);
  }
  return {
    url: url.format(parsedPath),
    hash: ['#'].concat(hash ? hash.split('/') : [])
  };
}
export function normalizeUri(path:string, scope?:string, omitEmptyFragment:boolean = false):string {
  var uri:ResolvedUri = resolveUri(path, scope);
  var hash = uri.hash.join('/');
  return uri.url + (!omitEmptyFragment || hash !== '#' ? hash : '');
}
export function pointer(data:any, path:string|string[], value?:any):any {
  if (arguments.length < 2) {
    return undefined;
  }
  var _data = data;
  var _path = typeof path === 'string' ? (path === '/' ? [ ] : path.split('/')) : path;
  if (arguments.length > 2) {
    for (var i = 0, max = _path.length - 1, p = null ; p = _path[i], i < max; i++) {
      if ((p === '#' || p === '') && i === 0) {
        continue;
      } else {
        if (typeof _data[p] !== 'object') {
          _data[p] = (parseInt(_path[i + 1]) || _path[i + 1] === '0') ? [] : {};
        }
        _data = _data[p];
      }
    }
    if (typeof value !== 'undefined') {
      _data[p] = value;
      _data = _data[p];
    } else {
      delete _data[p];
      _data = undefined;
    }
  } else {
    for (var i = 0, _data = data ; typeof _data !== 'undefined' && _path && i < _path.length ; i++) {
      if ((_path[i] === '#' || _path[i] === '') && i === 0) {
        continue;
      } else {
        _data = _data[_path[i]];
      }
    }
  }
  return _data;
}
export function scope(data:any):string {
  return typeof data === 'object' ? data[__scope] : undefined;
}
export function parse(dataOrUri:any, opts:ParseOptions = {}):Promise<any> {
  var _opts = opts;
  var _store = _opts.store || {};
  var _retriever = _opts.retriever || function(url) {
    return Promise.reject(new Error('no_retriever'));
  };
  var _root;
  function _register(path:string, scope:string, data:any):string {
    var resolved = normalizeUri(path, scope);
    _store[resolved] = data;
    return resolved;
  }
  function _getPointer(path:string, scope:string):Promise<{ data:any, path:string[] }> {
    var uri = resolveUri(path, scope);
    var data;
    for (var i = uri.hash.length, k ; !data && i > 0 ; i--) {
      k = uri.url + uri.hash.slice(0, i).join('/');
      if (k === '#') {
        data = _root;
      } else {
        data = _store[k];
      }
    }
    if (data) {
      return Promise.resolve({ data: data, path: uri.hash.slice(i) });
    } else {
      return _retriever(uri.url).then(function(data) {
        _register(uri.url, '', data);
        return _parse(data, uri.url).then(function(data) {
          return { data: data, path: uri.hash };
        });
      });
    }
  }
  function _get(path:string, scope:string):any {
    return _getPointer(path, scope).then(function(res) {
      return pointer(res.data, res.path);
    });
  }
  function _parse(data:any, scope:string):Promise<any> {
    _root = data;
    if (scope) {
      scope = normalizeUri(null, scope);
      _register(null, scope, data);
    }
    function _parsePassOne(data:any, scope:string):void {
      var _scope, i, o;
      if (typeof data.id === 'string') {
        _scope = _register(data.id, scope, data);
      } else {
        _scope = scope || '#';
      }
      data[__scope] = _scope;
      for (i in data) {
        o = data[i];
        if (typeof o === 'object' && !isRef(o)) {
          _parsePassOne(o, _scope + '/' + i);
        }
      }
    }
    function _parsePassTwo(data:any):Promise<any> {
      var p = Promise.resolve(true);
      var _scope = data[__scope];
      function _deref(key, ref) {
        return p.then(function() {
          return _getPointer(ref, _scope).then(function(derefPointer) {
            Object.defineProperty(data, key, {
              get: function() {
                return pointer(derefPointer.data, derefPointer.path);
              },
              set: function(v) {
                return pointer(derefPointer.data, derefPointer.path, v);
              },
              enumerable: true,
              configurable: true
            });
            return true;
          });
        });
      }
      function _recurse(key, obj) {
        return p.then(function() {
          return _parsePassTwo(obj);
        });
      }
      var i, o;
      for (i in data) {
        o = data[i];
        if (typeof o === 'object') {
          if (isRef(o)) {
            p = _deref(i, o.$ref);
          } else {
            p = _recurse(i, o);
          }
        }
      }
      return p;
    }
    _parsePassOne(data, scope);
    return _parsePassTwo(data).then(function() {
      return data;
    });
  }

  if (typeof dataOrUri === 'string') {
    return _get(dataOrUri, _opts.scope);
  } else if (typeof dataOrUri === 'object') {
    if (isRef(dataOrUri)) {
      return _parse({ __tmp: dataOrUri }, _opts.scope).then(function(data) {
        return data.__tmp;
      });
    } else {
      return _parse(dataOrUri, _opts.scope);
    }
  } else {
    return Promise.reject(new Error('bad_data'));
  }
}
export function normalize(data:any, scope:string):any {
  if (scope) {
    scope = normalizeUri(null, scope);
  }
  if (typeof data === 'object') {
    var _scope, i, o;
    if (typeof data.id === 'string') {
      _scope = normalizeUri(data.id, scope);
    } else {
      _scope = scope || '#';
    }
    for (i in data) {
      o = data[i];
      if (typeof o === 'object') {
        if (isRef(o)) {
          o.$ref = normalizeUri(o.$ref, _scope, true);
        } else {
          normalize(o, _scope + '/' + i);
        }
      }
    }
  }
  return data;
}
