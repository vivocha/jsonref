import url from 'url';

var __scope = Symbol();

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
export function parse(dataOrUri, store, retriever) {
  var _store = store || {};
  var _retriever = retriever || function () {
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
    _root = data;
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
          if (typeof o === 'object' && !o.$ref) {
            _parsePassOne(o, _scope + '/' + i);
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
          _scope = scope || '#';
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
            return _parsePassTwo(obj, _scope + '/' + i);
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

  if (typeof dataOrUri === 'string') {
    return _get(dataOrUri);
  } else {
    return _parse(null, null, dataOrUri);
  }
}
