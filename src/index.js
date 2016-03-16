import url from 'url';

export function pointer(data, path) {
  var _data = data;
  var _path = typeof path === 'string' ? path.split('/') : path;
  for (var i = 0 ; _path && i < _path.length ; i++) {
    if (_path[i] === '#' && i === 0) {
      _data = data;
    } else {
      _data = _data[_path[i]];
    }
  }
  return _data;
}
export function parse(data, store, retriever) {
  var _store = store || {};
  var _retriever = retriever || function () {
    return Promise.reject(new Error('no_retriever'));
  };
  var _root = data;
  function _resolve(path, scope) {
    var resolvedPath = url.resolve(scope || '', path || '');
    var parsedPath = url.parse(resolvedPath);
    var hash = parsedPath.hash;
    delete parsedPath.hash;
    var out = {
      url: url.format(parsedPath)
    };
    if (hash) {
      out.hash = hash.split('/');
    } else {
      out.hash = ['#'];
    }
    return out;
  }
  function _register(path, scope, data) {
    var uri = _resolve(path, scope);
    var resolved = uri.url + uri.hash.join('/');
    _store[resolved] = data;
    return resolved;
  }
  function _get(path, scope) {
    if (path === '#' && !scope) {
      return _root;
    } else {
      var uri = _resolve(path, scope);
      var data;
      for (var i = uri.hash.length, k ; !data && i > 0 ; i--) {
        k = uri.url + uri.hash.slice(0, i).join('/');
        data = _store[k];
      }
      if (data) {
        return Promise.resolve(pointer(data, uri.hash.slice(i)));
      } else {
        return _retriever(uri.url).then(function (data) {
          _register(uri.url, '', data);
          return _parse(uri.url, '', data).then(function (data) {
            return pointer(data, uri.hash);
          });
        });
      }
    }
  }
  function _getSync(path, scope) {
    var uri = _resolve(path, scope);
    var data;
    for (var i = uri.hash.length ; i > 0 ; i--) {
      data = _store[uri.url + url.hash.slice(0, i).join('/')];
      if (data) {
        return pointer(data, uri.hash.slice(i));
      }
    }
    return undefined;
  }
  function _parse(path, scope, data) {
    function _parsePassOne(data, scope) {
      if (typeof data === 'object') {
        var _scope, i, o;
        if (typeof data.id === 'string') {
          _scope = _register(data.id, scope, data);
        } else {
          _scope = scope;
        }
        for (i in data) {
          o = data[i];
          if (typeof o === 'object' && !o.$ref) {
            _parsePassOne(o, _scope);
          }
        }
      }
    }
    function _parsePassTwo(data, scope) {
      var p = Promise.resolve(true);
      if (typeof data === 'object') {
        var _scope, i, o;
        if (typeof data.id === 'string') {
          var uri = _resolve(data.id, scope);
          _scope = uri.url + uri.hash.join('/');
        } else {
          _scope = scope;
        }
        function _deref(key, ref) {
          return p.then(function() {
            return _get(ref, _scope).then(function(derefData) {
              data[key] = derefData;
              return true;
            });
          });
        }
        function _recurse(key, obj) {
          return p.then(function() {
            return _parsePassTwo(obj, _scope);
          });
        }
        for (i in data) {
          o = data[i];
          if (typeof o === 'object') {
            if (o.$ref) {
              p = _deref(i, o.$ref);
            } else {
              p = _recurse(i, o);
            }
          }
        }
      }
      return p;
    }
    _parsePassOne(data);
    return _parsePassTwo(data).then(function() {
      return data;
    });
  }
  return _parse(null, null, _root);
}

/*
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
          return resolve(ref, _scope, _opts).then(function() {
            delete data[key];
            Object.defineProperty(data, key, {
              get: function() {
                var resolved = resolvePath(ref, _scope);
                var data = (_opts.store ? _opts.store.get(resolved.url) : undefined) || _globalStore.get(resolved.url);
                return data ? pointer(data, resolved.hash) : undefined;
              },
              set: function(data) {
                //noop
              }
            });
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
*/









