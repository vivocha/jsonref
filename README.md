# jsonref

A powerful JavaScript library implementing the [JSON Reference](http://tools.ietf.org/html/draft-pbryan-zyp-ref-03) and [JSON Pointer](http://tools.ietf.org/html/rfc6901) specifications. Resolve `$ref` references in JSON documents, handle external references, and manipulate JSON data using JSON Pointer syntax.

[![npm version](https://img.shields.io/npm/v/jsonref.svg)](https://www.npmjs.com/package/jsonref)
[![CI](https://github.com/vivocha/jsonref/actions/workflows/ci.yml/badge.svg)](https://github.com/vivocha/jsonref/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/vivocha/jsonref/badge.svg?branch=master)](https://coveralls.io/github/vivocha/jsonref?branch=master)

## Features

- ✅ **JSON Reference Resolution**: Resolve `$ref` references in JSON documents
- ✅ **External References**: Fetch and resolve external URI references
- ✅ **JSON Pointer**: Navigate and manipulate JSON data using JSON Pointer syntax
- ✅ **Caching**: Built-in store mechanism for efficient reference caching
- ✅ **TypeScript Support**: Full TypeScript definitions included
- ✅ **Modern ES Modules**: Supports both ESM and CommonJS
- ✅ **Browser & Node.js**: Works in both environments
- ✅ **Zero Dependencies**: Lightweight with no external dependencies

## Installation

```bash
# npm
npm install jsonref

# pnpm
pnpm add jsonref

# yarn
yarn add jsonref
```

## Quick Start

### Basic Reference Resolution

```javascript
import { parse } from 'jsonref';

const schema = {
  "definitions": {
    "person": {
      "type": "object",
      "properties": {
        "name": { "type": "string" }
      }
    }
  },
  "type": "object",
  "properties": {
    "user": { "$ref": "#/definitions/person" }
  }
};

const resolved = await parse(schema);
console.log(resolved.properties.user); // { type: "object", properties: { name: { type: "string" } } }
```

### External Reference Resolution

```javascript
import { parse } from 'jsonref';

const schema = {
  "allOf": [
    { "$ref": "https://json-schema.org/draft/2019-09/schema" },
    { "type": "object" }
  ]
};

// Define a retriever function to fetch external references
function retriever(url) {
  return fetch(url).then(response => response.json());
}

const resolved = await parse(schema, { retriever });
```

## API Reference

### parse(dataOrUri, options?)

Resolves all `$ref` references in a JSON document.

**Parameters:**
- `dataOrUri` (object | string): The JSON data to parse or a URI to fetch
- `options` (object, optional): Configuration options
  - `scope` (string): Base URI for resolving relative references
  - `store` (object): Cache object to store resolved references for reuse
  - `retriever` (function): Function to fetch external references `(url: string) => Promise<object>`

**Returns:** `Promise<object>` - The resolved JSON data

**Example:**
```javascript
import { parse } from 'jsonref';

const schema = {
  "definitions": {
    "user": { "type": "object", "properties": { "id": { "type": "string" } } }
  },
  "properties": {
    "currentUser": { "$ref": "#/definitions/user" }
  }
};

const resolved = await parse(schema);
```

### pointer(data, path, value?)

Navigate or modify JSON data using JSON Pointer syntax.

**Parameters:**
- `data` (object): The object to traverse
- `path` (string | string[]): JSON Pointer path (e.g., `"/users/0/name"` or `["users", "0", "name"]`)
- `value` (any, optional): Value to set at the specified path

**Returns:** The value at the path, or the modified object if setting a value

**Examples:**
```javascript
import { pointer } from 'jsonref';

const data = {
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 }
  ]
};

// Get a value
const name = pointer(data, "/users/0/name"); // "Alice"

// Set a value
pointer(data, "/users/0/age", 31);
console.log(data.users[0].age); // 31

// Create nested paths
pointer(data, "/users/0/address/city", "New York");
```

### Additional Utilities

The library also exports several utility functions for advanced use cases:

- `isRef(obj)` - Check if an object is a JSON Reference
- `isAnnotated(obj)` - Check if an object has been processed by jsonref
- `getMeta(obj)` - Get metadata from a processed object
- `normalize(obj)` - Normalize `$id` and `$ref` values in an object
- `scope(obj)` - Get the resolution scope of an object

## Usage Examples

### Working with JSON Schema

```javascript
import { parse } from 'jsonref';

const schema = {
  "$id": "https://example.com/person.schema.json",
  "type": "object",
  "properties": {
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "age": { "$ref": "#/definitions/positiveInteger" }
  },
  "definitions": {
    "positiveInteger": {
      "type": "integer",
      "minimum": 0
    }
  }
};

const resolved = await parse(schema);
console.log(resolved.properties.age); // { type: "integer", minimum: 0 }
```

### Using Custom Store for Performance

```javascript
import { parse } from 'jsonref';

const store = {}; // Reuse this store across multiple parse operations

const schema1 = {
  "allOf": [{ "$ref": "https://json-schema.org/draft-07/schema" }]
};

const schema2 = {
  "allOf": [{ "$ref": "https://json-schema.org/draft-07/schema" }]
};

// First parse will fetch the external reference
const resolved1 = await parse(schema1, { store, retriever });

// Second parse will use cached reference (faster)
const resolved2 = await parse(schema2, { store, retriever });
```

### Advanced JSON Pointer Usage

```javascript
import { pointer } from 'jsonref';

const config = {
  database: {
    host: "localhost",
    port: 5432,
    credentials: {
      username: "admin",
      password: "secret"
    }
  },
  features: ["auth", "logging"]
};

// Navigate nested objects
const host = pointer(config, "/database/host"); // "localhost"

// Work with arrays
const firstFeature = pointer(config, "/features/0"); // "auth"

// Modify existing values
pointer(config, "/database/port", 3306);

// Create new nested structures
pointer(config, "/cache/redis/host", "redis.example.com");
console.log(config.cache); // { redis: { host: "redis.example.com" } }
```

### Custom Retriever Implementations

#### Browser with fetch
```javascript
function retriever(url) {
  return fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  });
}
```

#### Node.js with built-in fetch (Node 18+)
```javascript
import { fetch } from 'undici'; // or use built-in fetch in Node 18+

function retriever(url) {
  return fetch(url).then(response => response.json());
}
```

#### Node.js with file system support
```javascript
import fs from 'fs/promises';
import path from 'path';

function retriever(url) {
  if (url.startsWith('file://')) {
    const filePath = url.replace('file://', '');
    return fs.readFile(filePath, 'utf8').then(JSON.parse);
  }
  
  // Handle HTTP URLs
  return fetch(url).then(response => response.json());
}
```

## Error Handling

The library provides comprehensive error handling for various scenarios:

```javascript
import { parse } from 'jsonref';

try {
  // This will throw an error because no retriever is provided for external reference
  const schema = { "$ref": "https://example.com/schema.json" };
  await parse(schema); // Throws: no_retriever
} catch (error) {
  console.error('Error:', error.message);
}

// Proper error handling with retriever
async function safeRetriever(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { parse, pointer, isRef, ParseOptions } from 'jsonref';

interface Schema {
  type: string;
  properties?: Record<string, any>;
}

const options: ParseOptions = {
  retriever: async (url: string) => {
    const response = await fetch(url);
    return response.json();
  }
};

const schema: Schema = {
  type: "object",
  properties: {
    user: { "$ref": "#/definitions/user" }
  }
};

const resolved = await parse(schema, options);
```

## Performance Tips

1. **Reuse stores** for better performance when parsing multiple documents with shared references
2. **Cache external references** by implementing a smart retriever function
3. **Use scopes** when working with relative references to avoid unnecessary network requests

```javascript
// Efficient caching retriever
const cache = new Map();

function cachingRetriever(url) {
  if (cache.has(url)) {
    return Promise.resolve(cache.get(url));
  }
  
  return fetch(url)
    .then(response => response.json())
    .then(data => {
      cache.set(url, data);
      return data;
    });
}
```

## Browser Support

jsonref works in all modern browsers that support:
- Promises (or use a polyfill)
- Object.keys, Object.defineProperty
- JSON.parse/JSON.stringify

For older browsers, consider using polyfills for missing features.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and ensure all tests pass:

```bash
pnpm install
pnpm test
pnpm run coverage
```
