# @xuaic/local-typing-monaco

A TypeScript definition resolver for Monaco Editor that resolves types from local node_modules.

[中文文档](./README.zh-CN.md)

## Key Features

- 🔍 Resolves TypeScript definitions from local node_modules
- 🚀 Recursively resolves references and imports within package
- 💾 Built-in memory cache
- 🛠 Configurable resolution options
- 📦 Supports various type definition formats (types, typings, typeVersions in package.json)

## Important Notes

- This library only resolves type definitions from the root node_modules directory
- It does not recursively resolve dependencies in package's node_modules
- Package version conflicts are not handled as it only uses the root package
- Ideal for development environments where you want to use local type definitions

## Installation

```bash
npm install @xuaic/local-typing-monaco
# or
yarn add @xuaic/local-typing-monaco
```

## Usage

```typescript
import { TypeDefinitionResolver } from '@xuaic/local-typing-monaco';

const resolver = new TypeDefinitionResolver({
  cacheEnabled: true,
  recursionLimit: 10,
  baseUrl: '/node_modules', // Path to your node_modules directory
  cachePrefix: 'typing-cache' // Memory cache prefix
});

// Resolve type definitions for a package
const typeDefinitions = await resolver.resolveTypeDefinition('lodash');

// Add type definitions to Monaco Editor
typeDefinitions.forEach(def => {
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    def.content,
    def.filePath
  );
});
```

## Static Resource Hosting

The library needs access to your node_modules directory through HTTP requests. You need to set up static file hosting for your node_modules directory. Here are a few ways to do this:

1. Using Express.js:
```javascript
app.use('/node_modules', express.static('node_modules'));
```

2. Using Vite:
```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/node_modules': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/node_modules/, '')
      }
    }
  }
}
```

3. Using Nginx:
```nginx
location /node_modules {
    alias /path/to/your/node_modules;
    autoindex off;
}
```

Make sure to:
- Set the correct CORS headers if needed
- Configure proper security measures
- Only enable in development environment

## Configuration Options

```typescript
interface TypesResolveOptions {
  // Enable memory cache
  cacheEnabled?: boolean;
  // Base URL for node_modules
  baseUrl?: string;
  // Prefix for type definition file paths
  pathPrefix?: string;
}
```

## Example

Check out the [example](./example) directory for a complete example project. The example uses vanilla JavaScript and has no build dependencies.

## How It Works

1. First attempts to read type information from package.json
2. Looks for type definitions in the following order:
   - typeVersions field
   - exports.types field
   - types/typings field
   - default index.d.ts
3. Recursively resolves all references (/// <reference>) and imports within the package
4. Caches results in memory

## Limitations

- Only resolves types from root node_modules
- Does not handle nested dependencies
- Package version conflicts are not resolved
- Best suited for development environments

## License

MIT 