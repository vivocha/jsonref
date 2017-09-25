# jsonref

A simple Javascript library implementing the [JSON Reference](http://tools.ietf.org/html/draft-pbryan-zyp-ref-03) and the [JSON Pointer](http://tools.ietf.org/html/rfc6901) specifications.

[![travis build](https://img.shields.io/travis/vivocha/jsonref.svg)](https://travis-ci.org/vivocha/jsonref)
[![coveralls coverage](https://img.shields.io/coveralls/c/github/vivocha/jsonref.svg)](https://coveralls.io/gh/vivocha/jsonref)
[![npm version](https://img.shields.io/npm/v/jsonref.svg)](https://www.npmjs.com/package/jsonref)

## Install

```bash
$ npm install jsonref
```

## parse(dataOrUri _[, options]_)

* `dataOrUri`, the data to parse or a fully qualified URI to pass to `retriever` to download the data
* `options` (optional), parsing options, the following optional properties are supported:
  * `scope`, the current resolution scope (base href) of URLs and paths.
  * `store`, an object to use to cache resolved `id`  and `$ref` values. If no store is passed,
one is automatically created. Pass a `store` if you are going to parse several objects or URIs referencing
the same `id` and `$ref` values.
  * `retriever`, a function accepting a URL in input and returning a promise resolved to an object
representing the data downloaded for the URI. Whenever a `$ref` to a new URI is found, if the URI is not
already cached in the store in use, it'll be fetched using this `retriever`. If not `retriever` is passed
and a URI needs to be downloaded, a `no_retriever` exception is thrown.

The function returns a Promise resolving to the parsed data, with all `$ref` instances resolved.

### Sample browser-friendly `retriever` using `fetch`

```javascript
function retriever(url) {
  var opts = {
    method: 'GET',
    credentials: 'include'
  };
  return fetch(url, opts).then(function(response) {
    return response.json();
  });
}
```

### Sample node.js `retriever` using `request`

```javascript
var request = require('request');

function retriever(url) {
  return new Promise(function(resolve, reject) {
    request({
      url: url,
      method: 'GET',
      json: true
    }, function(err, response, data) {
      if (err) {
        reject(err);
      } else if (response.statusCode !== 200) {
        reject(response.statusCode);
      } else {
        resolve(data);
      }
    });
  });
}
```

## pointer(data, path _[, value]_)

* `data`, the object to transverse using JSON Pointer.
* `path`, either a string (`#/prop1/prop2`) or an array of path components (`[ "#", "prop1", "prop2" ]`
or `[ "prop1", "prop2" ]`).
* `value`, optional, value to set at `path`. All missing intermediate path levels are created as well.

Returns the data requested or sets a new value at the specified path

## Examples

### Parsing an object with no external references

````javascript
var jsonref = require('jsonref');

var schema = {
  "id": "http://my.site/myschema#",
  "definitions": {
    "schema1": {
      "id": "schema1",
      "type": "integer"
    },
    "schema2": {
      "type": "array",
      "items": { "$ref": "schema1" }
    }
  }
}

jsonref.parse(schema).then(function(result) {
  console.log(JSON.stringify(result, null, 2));
});
````

The output is:

```javascript
{
  "id": "http://my.site/myschema#",
  "definitions": {
    "schema1": {
      "id": "schema1",
      "type": "integer"
    },
    "schema2": {
      "type": "array",
      "items": {
        "id": "schema1",
        "type": "integer"
      }
    }
  }
}
```

### Parsing an object with external references

```javascript
var jsonref = require('jsonref');

var schema = {
  "allOf": [
    { "$ref": "http://json-schema.org/draft-04/schema#" },
    {
      "type": "object",
      "properties": {
        "documentation": {
          "type": "string"
        }
      }
    }
  ]
}

jsonref.parse(schema, {
  retriever: retriever
}).then(function(result) {
  console.log(JSON.stringify(result, null, 2));
});
```

The library will call `retriever("http://json-schema.org/draft-04/schema#")` to download the external
reference. If no `retriever` is passed, the returned value is a rejected Promise, with a `no_retriever`
exception.

### Parsing an object using a custom store

```javascript
var jsonref = require('jsonref');

var store = {};
var schema = {
  "id": "http://my.site/myschema#",
  "definitions": {
    "schema1": {
      "id": "schema1",
      "type": "integer"
    },
    "schema2": {
      "type": "array",
      "items": { "$ref": "schema1" }
    }
  }
}

jsonref.parse(schema, {
  store: store
}).then(function(result) {
  console.log(JSON.stringify(result, null, 2));
});
```

After parsing, the contents of the store are:

```javascript
{
  "http://my.site/myschema#": {
    "id": "http://my.site/myschema#",
    "definitions": {
      "schema1": {
        "id": "schema1",
        "type": "integer"
      },
      "schema2": {
        "type": "array",
        "items": {
          "id": "schema1",
          "type": "integer"
        }
      }
    }
  },
  "http://my.site/schema1#": {
    "id": "schema1",
    "type": "integer"
  }
}
```
