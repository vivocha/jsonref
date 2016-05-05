import url from 'url';

var __scope = Symbol();

function isRef(obj) {
  return typeof obj === 'object' && typeof obj.$ref === 'string' && Object.keys(obj).length === 1;
}

export function resolveUri(path, scope) {
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
export function normalizeUri(path, scope, omitEmptyFragment) {
  var uri = resolveUri(path, scope);
  var hash = uri.hash.join('/')
  return uri.url + (!omitEmptyFragment || hash !== '#' ? hash : '');
}
export function pointer(data, path, value) {
  if (arguments.length < 2) {
    return undefined;
  }
  var _data = data;
  var _path = typeof path === 'string' ? path.split('/') : path;
  if (arguments.length > 2) {
    for (var i = 0, max = _path.length - 1, p = null ; p = _path[i], i < max; i++) {
      if ((p === '#' || p === '') && i === 0) {
        continue;
      } else {
        if (typeof _data[p] !== 'object') {
          _data[p] = (parseInt(_path[i + 1]) || _path[i + 1] == 0) ? [] : {};
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
    for (var i = 0, _data = data ; _data && _path && i < _path.length ; i++) {
      if ((_path[i] === '#' || _path[i] === '') && i === 0) {
        continue;
      } else {
        _data = _data[_path[i]];
      }
    }
    return _data;
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
  function _register(path, scope, data) {
    var resolved = normalizeUri(path, scope);
    _store[resolved] = data;
    return resolved;
  }
  function _getPointer(path, scope) {
    if (path === '#' && !scope) {
      return _root;
    } else {
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
  }
  function _get(path, scope) {
    return _getPointer(path, scope).then(function(res) {
      return pointer(res.data, res.path);
    });
  }
  function _parse(data, scope) {
    _root = data;
    if (scope) {
      scope = normalizeUri(null, scope);
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
export function normalize(data, scope) {
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
