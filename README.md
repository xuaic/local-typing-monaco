# @xuaic/local-typing-monaco

A TypeScript definition resolver for Monaco Editor that resolves types from local node_modules.

[中文文档](./README.zh-CN.md)

## Key Features

- 🔍 Resolves TypeScript definitions from local node_modules
- 🚀 Recursively resolves references and imports within package
- 💾 Built-in memory cache
- 🛠 Configurable resolution options
- 📦 Supports multiple type definition sources:
  - ✨ Prioritizes `@types` packages for type definitions
  - 📝 Package's own type definition files
  - 🎯 Types from package.json fields (types, typings, exports, typeVersions)
  - 🔄 Auto-generated default types (when no types found)

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
  cacheEnabled: true, // Enable caching
  baseUrl: '/node_modules', // Path to your node_modules directory
  pathPrefix: '', // Prefix for type definition file paths
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
    fs: {
      // Allow serving files from parent directory's node_modules
      allow: ['..']
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
  /**
   * Enable memory cache
   * @default true
   */
  cacheEnabled?: boolean;
  
  /**
   * Base URL for node_modules
   * @default '/node_modules'
   */
  baseUrl?: string;
  
  /**
   * Prefix for type definition file paths
   * @default ''
   */
  pathPrefix?: string;
}
```

## Example

Check out the [example](./example) directory for a complete example project. The example uses vanilla JavaScript and has no build dependencies.

## Features

- 🚀 Automatically resolves npm package type definitions
- 💪 Supports multiple type definition sources:
  - ✨ Prioritizes `@types` packages for type definitions
  - 📦 Package's own type definition files
  - 🔍 types/typings fields in package.json
  - 🎯 Types in exports field
  - 📝 typeVersions field support
  - 🔄 Auto-generated default types (when no types found)
- 🗂️ Supports type reference (/// <reference>) resolution
- 📥 Supports import statement resolution
- ⚡️ Built-in caching support (configurable)
- 🔧 Customizable base URL and path prefix

## How It Works

When requesting type definitions for a package, the resolver follows this order:

1. First checks if a corresponding `@types` package exists (e.g., for `lodash`, it first looks for `@types/lodash`)
2. If an `@types` package is found, uses its type definitions
3. If no `@types` package is found, attempts to get type definitions from the original package:
   - Checks type-related fields in package.json
   - Looks for default type definition file locations
   - Resolves all references and imports
4. If no type definitions are found, generates a default `any` type definition

All resolved type definitions are cached, whether they come from `@types` packages or original packages, to improve subsequent access performance.

## Limitations

- Only resolves types from root node_modules
- Does not handle nested dependencies
- Package version conflicts are not resolved
- Best suited for development environments

## License

MIT 