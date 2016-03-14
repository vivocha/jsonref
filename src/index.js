import url from 'url';
import { Store } from './store';
export { Store } from './store';

var _globalStore = new Store();
var _options = {};

function resolvePath(path, scope) {
  var resolvedPath = url.resolve(scope || '', path || '');
  var parsedPath = url.parse(resolvedPath);
  var hash = parsedPath.hash;
  delete parsedPath.hash;
  var out = {
    url: url.format(parsedPath)
  };
  if (hash && hash[0] === '#') {
    out.hash = hash.substr(1).split('/');
  } else {
    out.hash = [];
  }
  return out;
}

export function pointer(data, path) {
  for (var i = 0 ; path && data && i < path.length ; i++) {
    if (path[i]) data = data[path[i]];
  }
  return data;
}
export function parse(data, opts) {
  var _opts = opts || {};
  if (!_opts.store) _opts.store = new Store();
  _opts.store.register("", data);
  function parsePassOne(data, scope) {
    var p = Promise.resolve(true);
    if (typeof data === 'object') {
      let _scope;
      if (typeof data.id === 'string') {
        _scope = resolvePath(data.id, scope || '').url;
        _opts.store.register(_scope, data);
      } else {
        _scope = scope;
      }
      function recurse(key, obj) {
        return p.then(function() {
          return parsePassOne(obj, _scope);
        });
      }
      let i, o;
      for (i in data) {
        o = data[i];
        if (typeof o === 'object' && !o.$ref) {
          p = recurse(i, o);
        }
      }
    }
    return p;
  }
  function parsePassTwo(data, scope) {
    var p = Promise.resolve(true);
    if (typeof data === 'object') {
      let _scope;
      if (typeof data.id === 'string') {
        _scope = resolvePath(data.id, scope || '').url;
      } else {
        _scope = scope;
      }
      function deref(key, ref) {
        return p.then(function() {
          return resolve(ref, _scope, _opts).then(function(value) {
            data[key] = value;
            return true;
          });
        });
      }
      function recurse(key, obj) {
        return p.then(function() {
          return parsePassTwo(obj, _scope);
        });
      }
      let i, o;
      for (i in data) {
        o = data[i];
        if (typeof o === 'object') {
          if (o.$ref) {
            p = deref(i, o.$ref);
          } else {
            p = recurse(i, o);
          }
        }
      }
    }
    return p;
  }
  return parsePassOne(data).then(function() {
    return parsePassTwo(data).then(function() {
      return data;
    });
  });
}
export function register(url, data) {
  _globalStore.register(url, data);
  return data;
}
export function retrieve(url, opts) {
  var _opts = opts || {};
  return _opts.retriever(url).then(function(data) {
    return parse(data, _opts).then(function(data) {
      return (_opts.store || _globalStore).register(url, data);
    });
  });
}
export function resolve(path, scope, opts) {
  var _opts = opts || {};
  var resolved = resolvePath(path, scope);
  return Promise.resolve((_opts.store ? _opts.store.get(resolved.url) : undefined) || _globalStore.get(resolved.url) || retrieve(resolved.url, _opts)).then(function(data) {
    return pointer(data, resolved.hash);
  });
}
export function store() {
  return _globalStore;
}
export function option(key, value) {
  _options[key] = value;
}
