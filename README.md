# jsonref

A simple Javascript library implementing [JSON Reference](http://tools.ietf.org/html/draft-pbryan-zyp-ref-03) and [JSON Pointer](http://tools.ietf.org/html/rfc6901) specifications.

[![Build Status](https://travis-ci.org/vivocha/jsonref.svg?branch=master)](https://travis-ci.org/vivocha/jsonref)
[![NPM version](https://badge.fury.io/js/jsonref.png)](http://badge.fury.io/js/jsonref)

[![Dependency Status](https://david-dm.org/vivocha/jsonref/status.svg)](https://david-dm.org/vivocha/jsonref)
[![devDependency Status](https://david-dm.org/vivocha/jsonref/dev-status.svg)](https://david-dm.org/vivocha/jsonref#info=devDependencies)

## Install

```bash
$ npm install jsonref
```

## parse(dataOrUri, store, retriever)

* `dataOrUri`, the data to parse or a fully qualified URI to pass to `retriever` to download the data
* `store` (optional), an object to use to cache resolved `id`  and `$ref` values. If no store is passed,
one is automatically created. Pass a `store` if you are going to parse several objects or URIs referencing
the same `id` and `$ref` values.
* `retriever` (optional), a function accepting a URL in input and returning a promise resolved to an object
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

## pointer(data, path)

* `data`, the object to transverse using JSON Pointer.
* `path`, either a string (`#/prop1/prop2`) or an array of path components (`[ "#", "prop1", "prop2" ]`
or `[ "prop1", "prop2" ]`).

Returns the data requested

## Examples

### Parsing an object with no external references

````javascript
parse({
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
}).then(function(data) {
  console.log(JSON.stringify(data, null, 2));
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
parse({
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
}, null, retriever).then(function(data) {
  console.log(JSON.stringify(data, null, 2));
});
```

The library will call `retriever("http://json-schema.org/draft-04/schema#")` to download the external
reference. If no `retriever` is passed, the returned value is a rejected Promise, with a `no_retriever`
exception.

### Parsing an object using a custom store

```javascript
var store = {};

parse({
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
}, store).then(function(data) {
  console.log(JSON.stringify(store, null, 2));
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
