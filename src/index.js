import url from 'url';

var __scope = Symbol();

function isRef(obj) {
  return typeof obj === 'object' && typeof obj.$ref === 'string' && Object.keys(obj).length === 1;
}

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
export function scope(data) {
  return typeof data === 'object' ? data[__scope] : undefined;
}
export function parse(dataOrUri, opts) {
  var _opts = opts || {};
  var _store = _opts.store || {};
  var _retriever = _opts.retriever || function () {
      return Promise.reject(new Error('no_retriever'));
    };
  var _root;
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
  function _normalize(path, scope) {
    var uri = _resolve(path, scope);
    return uri.url + uri.hash.join('/');
  }
  function _register(path, scope, data) {
    var resolved = _normalize(path, scope);
    _store[resolved] = data;
    return resolved;
  }
  function _getPointer(path, scope) {
    if (path === '#' && !scope) {
      return _root;
    } else {
      var uri = _resolve(path, scope);
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
  }
  function _get(path, scope) {
    return _getPointer(path, scope).then(function(res) {
      return pointer(res.data, res.path);
    });
  }
  function _parse(data, scope) {
    _root = data;
    if (scope) {
      scope = _normalize(null, scope);
      _register(null, scope, data);
    }
    function _parsePassOne(data, scope) {
      if (typeof data === 'object') {
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
    }
    function _parsePassTwo(data, scope) {
      var p = Promise.resolve(true);
      if (typeof data === 'object') {
        var _scope = data[__scope] || scope;
        function _deref(key, ref) {
          return p.then(function() {
            return _getPointer(ref, _scope).then(function(derefPointer) {
              Object.defineProperty(data, key, {
                get: function() {
                  return pointer(derefPointer.data, derefPointer.path);
                },
                set: function(v) {
                  return pointer(derefPointer.data, derefPointer.path);
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
            return _parsePassTwo(obj, _scope + '/' + key);
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
      }
      return p;
    }
    _parsePassOne(data, scope);
    return _parsePassTwo(data, scope).then(function() {
      return data;
    });
  }

  if (typeof dataOrUri === 'string') {
    return _get(dataOrUri, _opts.scope);
  } else {
    return _parse(dataOrUri, _opts.scope);
  }
}
