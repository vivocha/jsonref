import url from 'url';

var _references = {};
var _options = {};

export function parse(data, _opts) {
  var opts = _opts || {};
  function parsePassOne(data, scope) {
    console.log('parsePassOne', scope, data);
    var p = Promise.resolve(true);
    if (typeof data === 'object') {
      let _scope;
      if (opts.registerIds && typeof data.id === 'string') {
        _scope = resolve(data.id, scope || '').url;
        console.log('registering new scope', _scope);
        register(_scope, data);
      } else {
        _scope = scope;
      }
      function recurse(key, obj) {
        return p.then(function() {
          console.log('parsing', key);
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
    console.log('parsePassTwo', scope, data);
    var p = Promise.resolve(true);
    if (typeof data === 'object') {
      let _scope;
      if (opts.registerIds && typeof data.id === 'string') {
        _scope = url.resolve(scope || '', data.id);
      } else {
        _scope = scope;
      }
      function resolve(key, ref) {
        return p.then(function() {
          console.log('resolving', key, ref);
          return reference(ref, _scope).then(function(data) {
            console.log('resolved', key, ref, data);
            data[key] = data;
            return true;
          });
        });
      }
      function recurse(key, obj) {
        return p.then(function() {
          console.log('parsing', key);
          return parsePassTwo(obj, _scope);
        });
      }
      let i, o;
      for (i in data) {
        o = data[i];
        if (typeof o === 'object') {
          if (o.$ref) {
            p = resolve(i, o.$ref);
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
  _references[url] = data;
  return data;
}
export function retrieve(url) {
  return options.retriever(url).then(function(data) {
    return parse(data).then(function(data) {
      return register(url, data);
    });
  });
}
export function resolve(path, scope) {
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
  for (var i = 0 ; path && data && i < path.length && path[i]; i++) {
    data = data[p[i]];
  }
  return data;
}
export function reference(path, scope) {
  console.log('getting reference', path, scope);
  var resolved = resolve(path, scope);
  return Promise.resolve(_references[resolved.url] || retrieve(resolved.url)).then(function(data) {
    return pointer(data);
  });
}
export function references() {
  return _references;
}
export function referenceIds() {
  return Object.keys(_references);
}
export function option(key, value) {
  _options[key] = value;
}
