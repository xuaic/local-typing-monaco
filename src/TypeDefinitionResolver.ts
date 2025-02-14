import { PackageJson, TypeDefinitionResult, TypeDefinitionSource, TypesResolveOptions } from './types';
import pathBrowserify from 'path-browserify';
import { MemoryCache } from './MemoryCache';

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export class TypeDefinitionResolver {
  private cache: MemoryCache;
  private options: Required<TypesResolveOptions>;
  /** Hash set to prevent circular references */
  private processedFiles: Set<string>;

  constructor(options: TypesResolveOptions = {}) {
    this.options = {
      cacheEnabled: true,
      baseUrl: '/node_modules',
      pathPrefix: '',
      ...options
    };
    this.cache = new MemoryCache('typing-cache');
    this.processedFiles = new Set();
  }

  private getFilePath(packageName: string, relativePath: string): string {
    // 先处理包内路径
    const packagePath = pathBrowserify.join(packageName, relativePath);
    // 直接拼接 pathPrefix，不使用 pathBrowserify.join
    return normalizePath(`${this.options.pathPrefix}${packagePath}`);
  }

  /**
   * Resolve type definitions for a package
   * @param packageName Package name
   * @returns Type definition results
   */
  async resolveTypeDefinition(packageName: string): Promise<TypeDefinitionResult[]> {
    // Reset processed files set
    this.processedFiles.clear();

    if (this.options.cacheEnabled) {
      const cached = this.cache.getItem(packageName);
      if (cached && cached.fullyResolved) {
        return cached.results;
      }
    }

    try {
      const results: TypeDefinitionResult[] = [];

      // 确定要查找的包名
      let typesPackageName: string;
      if (packageName.startsWith('@types/')) {
        // 如果已经是 @types 包,直接使用
        typesPackageName = packageName;
      } else {
        // 否则转换为 @types 包名
        typesPackageName = `@types/${packageName.replace('@', '').replace('/', '__')}`;
        
        // 检查 @types 包是否已经缓存
        if (this.options.cacheEnabled) {
          const typesCache = this.cache.getItem(typesPackageName);
          if (typesCache && typesCache.fullyResolved) {
            return typesCache.results;
          }
        }
      }

      try {
        const typesPackageJson = await this.fetchPackageJson(typesPackageName);
        results.push({
          content: JSON.stringify(typesPackageJson),
          filePath: this.getFilePath(typesPackageName, 'package.json'),
          source: TypeDefinitionSource.PACKAGE_JSON
        });

        const typesPaths = await this.resolveTypePaths(typesPackageJson);
        for (const typePath of typesPaths) {
          const typeResults = await this.resolveTypeFiles(typesPackageName, typePath);
          if (typeResults.length > 0) {
            results.push(...typeResults);
          }
        }

        // 如果找到了 @types 包的类型定义
        if (results.length > 1) {
          if (this.options.cacheEnabled) {
            // 同时缓存原始包名和 @types 包名的结果
            this.cache.set(packageName, results);
            if (typesPackageName !== packageName) {
              this.cache.set(typesPackageName, results);
            }
          }
          return results;
        }
      } catch (error) {
        // 忽略错误,继续尝试从原始包获取类型
        console.debug(`No @types package found for ${packageName}, trying original package`);
      }

      const packageJson = await this.fetchPackageJson(packageName);
      results.push({
        content: JSON.stringify(packageJson),
        filePath: this.getFilePath(packageName, 'package.json'),
        source: TypeDefinitionSource.PACKAGE_JSON
      });

      const typePaths = await this.resolveTypePaths(packageJson);
      let mainTypePath: string | undefined;

      for (const typePath of typePaths) {
        const typeResults = await this.resolveTypeFiles(packageName, typePath);
        if (typeResults.length > 0) {
          results.push(...typeResults);
          // Record main type file path
          if (!mainTypePath && typePath.endsWith('index.d.ts')) {
            mainTypePath = typePath;
          }
        }
      }

      // If no type definitions found, use default any type
      if (results.length === 0) {
        results.push(this.generateDefaultTypings(packageName));
      }

      if (this.options.cacheEnabled) {
        this.cache.set(packageName, results, mainTypePath);
      }

      return results;
    } catch (error) {
      console.error(`Error resolving types for ${packageName}:`, error);
      // Return default type on error
      return [this.generateDefaultTypings(packageName)];
    }
  }

  /**
   * Generate default any type definition
   * @param packageName Package name
   * @returns Default type definition result
   */
  private generateDefaultTypings(packageName: string): TypeDefinitionResult {
    const content = this.generateDefaultTypeDefinition(packageName);
    return {
      content,
      filePath: this.getFilePath(packageName, 'index.d.ts'),
      source: TypeDefinitionSource.DEFAULT
    };
  }

  /**
   * Generate default type definition content
   * @param packageName Package name
   * @returns Type definition content
   */
  private generateDefaultTypeDefinition(packageName: string): string {
    return `
/**
 * Default type definition for ${packageName}
 * This is an auto-generated fallback definition.
 */

declare module '${packageName}' {
    const content: any;
    export default content;
    export * from '${packageName}/*';
}

declare module '${packageName}/*' {
    const content: any;
    export default content;
    export * as namespace ${packageName};
}
`;
  }

  /**
   * Fetch package.json content
   * @param packageName Package name
   * @returns package.json content
   */
  private async fetchPackageJson(packageName: string): Promise<PackageJson> {
    const response = await fetch(`${this.options.baseUrl}/${packageName}/package.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch package.json for ${packageName}`);
    }
    return response.json();
  }

  /**
   * Resolve all possible type definition file paths
   * @param packageJson package.json content
   * @returns Array of type definition file paths
   */
  private async resolveTypePaths(packageJson: PackageJson): Promise<string[]> {
    const paths: Set<string> = new Set();

    // 1. Check typeVersions
    if (packageJson.typeVersions) {
      for (const version in packageJson.typeVersions) {
        const typeVersionPaths = packageJson.typeVersions[version];
        if (Array.isArray(typeVersionPaths)) {
          typeVersionPaths.forEach(path => {
            if (path.includes('*')) {
              // Handle wildcards for packages like rxjs
              const basePath = path.replace('*', '');
              // Add main entry
              paths.add(pathBrowserify.join(basePath, 'index.d.ts'));
              // Add all possible submodules
              const subModules = ['internal', 'ajax', 'operators', 'testing', 'webSocket', 'fetch'];
              for (const module of subModules) {
                paths.add(pathBrowserify.join(basePath, module, 'index.d.ts'));
              }
            } else {
              paths.add(path);
            }
          });
        } else if (typeof typeVersionPaths === 'object') {
          // Handle mapped type versions
          Object.values(typeVersionPaths).forEach(pathArray => {
            if (Array.isArray(pathArray)) {
              pathArray.forEach(path => paths.add(path));
            }
          });
        }
      }
    }

    // 2. Check exports.types
    if (packageJson.exports) {
      const addExportTypes = (obj: Record<string, any>, prefix: string = '') => {
        for (const [key, value] of Object.entries(obj)) {
          if (value && typeof value === 'object') {
            if ('types' in value && typeof value.types === 'string') {
              paths.add(value.types);
            }
            if (!key.startsWith('.')) {
              addExportTypes(value, `${prefix}${key}/`);
            } else {
              addExportTypes(value, prefix);
            }
          } else if (typeof value === 'string' && key === 'types') {
            paths.add(value);
          }
        }
      };
      addExportTypes(packageJson.exports);
    }

    // 3. Check traditional type fields
    if (packageJson.types) {
      paths.add(packageJson.types);
    }
    if (packageJson.typings) {
      paths.add(packageJson.typings);
    }

    // 4. Default paths
    paths.add('index.d.ts');
    paths.add('dist/index.d.ts');
    paths.add('dist/types/index.d.ts');

    return Array.from(paths);
  }

  /**
   * Normalize relative path
   * @param currentDir Current directory
   * @param relativePath Relative path
   * @returns Normalized path
   */
  private normalizeRelativePath(currentDir: string, relativePath: string): string {
    return pathBrowserify.normalize(pathBrowserify.join(currentDir, relativePath));
  }

  /**
   * Resolve type file contents
   * @param packageName Package name
   * @param typesPath Type file path
   * @returns Type definition results array
   */
  private async resolveTypeFiles(packageName: string, typesPath: string): Promise<TypeDefinitionResult[]> {
    const results: TypeDefinitionResult[] = [];
    const baseUrl = `${this.options.baseUrl}/${packageName}`;
    const filePath = pathBrowserify.normalize(pathBrowserify.join(baseUrl, typesPath));
    
    // Check if file has been processed
    if (this.processedFiles.has(filePath)) {
      return [];
    }
    this.processedFiles.add(filePath);
    
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        return [];
      }
      
      const content = await response.text();
      results.push({
        content,
        filePath: this.getFilePath(packageName, typesPath),
        source: TypeDefinitionSource.BACKEND
      });

      // Resolve referenced type files
      await this.resolveReferences(content, packageName, typesPath, results);
      
      // Resolve import statements
      await this.resolveImports(content, packageName, typesPath, results);
      
    } catch (error) {
      console.error(`Error resolving type files for ${packageName}:`, error);
    }

    return results;
  }

  /**
   * Resolve type references in file
   * @param content File content
   * @param packageName Package name
   * @param currentPath Current file path
   * @param results Results array
   */
  private async resolveReferences(
    content: string,
    packageName: string,
    currentPath: string,
    results: TypeDefinitionResult[]
  ): Promise<void> {
    const referenceRegex = /\/\/\/\s*<reference\s+path="([^"]+)"\s*\/>/g;
    const matches = content.matchAll(referenceRegex);
    const currentDir = pathBrowserify.dirname(currentPath);

    for (const match of matches) {
      const referencePath = match[1];
      const baseUrl = `${this.options.baseUrl}/${packageName}`;
      const relativePath = this.normalizeRelativePath(currentDir, referencePath);
      const fullPath = pathBrowserify.normalize(pathBrowserify.join(baseUrl, relativePath));

      // Check if file has been processed
      if (this.processedFiles.has(fullPath)) {
        continue;
      }
      this.processedFiles.add(fullPath);

      try {
        const response = await fetch(fullPath);
        if (response.ok) {
          const referenceContent = await response.text();
          results.push({
            content: referenceContent,
            filePath: this.getFilePath(packageName, relativePath),
            source: TypeDefinitionSource.REFERENCE
          });

          // Recursively resolve references in referenced file
          await this.resolveReferences(referenceContent, packageName, relativePath, results);
          await this.resolveImports(referenceContent, packageName, relativePath, results);
        }
      } catch (error) {
        console.error(`Error resolving reference ${referencePath}:`, error);
      }
    }
  }

  /**
   * Resolve import statements in file
   * @param content File content
   * @param packageName Package name
   * @param currentPath Current file path
   * @param results Results array
   */
  private async resolveImports(
    content: string,
    packageName: string,
    currentPath: string,
    results: TypeDefinitionResult[]
  ): Promise<void> {
    const importRegex = /(?:import|export)\s+(?:{[^}]*}|\*\s+as\s+[^;]+)?\s*(?:from\s+)?['"]([^'"]+)['"]/g;
    const matches = content.matchAll(importRegex);
    const currentDir = pathBrowserify.dirname(currentPath);

    for (const match of matches) {
      const importPath = match[1];
      // Handle relative and package internal paths
      if (importPath.startsWith('.') || importPath.startsWith(packageName)) {
        const baseUrl = `${this.options.baseUrl}/${packageName}`;
        const resolvedPath = importPath.startsWith('.')
          ? this.normalizeRelativePath(currentDir, importPath)
          : pathBrowserify.normalize(importPath.replace(packageName, ''));
        
        const relativeTypePath = resolvedPath.endsWith('.d.ts') 
          ? resolvedPath 
          : resolvedPath.endsWith('.ts')
            ? resolvedPath.replace(/\.ts$/, '.d.ts')
            : `${resolvedPath}.d.ts`;

        const fullPath = pathBrowserify.normalize(pathBrowserify.join(baseUrl, relativeTypePath));

        // Check if file has been processed
        if (this.processedFiles.has(fullPath)) {
          continue;
        }
        this.processedFiles.add(fullPath);

        try {
          const response = await fetch(fullPath);
          if (response.ok) {
            const importContent = await response.text();
            results.push({
              content: importContent,
              filePath: this.getFilePath(packageName, relativeTypePath),
              source: TypeDefinitionSource.IMPORT
            });

            // Recursively resolve references in imported file
            await this.resolveReferences(importContent, packageName, relativeTypePath, results);
            await this.resolveImports(importContent, packageName, relativeTypePath, results);
          } else {
            // Try looking in dist/types directory
            const altPath = pathBrowserify.normalize(pathBrowserify.join(baseUrl, 'dist/types', relativeTypePath));
            const altResponse = await fetch(altPath);
            if (altResponse.ok) {
              const importContent = await altResponse.text();
              results.push({
                content: importContent,
                filePath: this.getFilePath(packageName, `dist/types/${relativeTypePath}`),
                source: TypeDefinitionSource.IMPORT
              });

              await this.resolveReferences(importContent, packageName, `dist/types/${relativeTypePath}`, results);
              await this.resolveImports(importContent, packageName, `dist/types/${relativeTypePath}`, results);
            }
          }
        } catch (error) {
          console.error(`Error resolving import ${importPath}:`, error);
        }
      }
    }
  }
} 