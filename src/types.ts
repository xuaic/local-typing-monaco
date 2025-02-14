export interface Package {
  name: string;
  version: string;
}

export interface PackageJson {
  name: string;
  types?: string;
  typings?: string;
  typeVersions?: Record<string, string[] | Record<string, string[]>>;
  exports?: Record<string, any>;
}

export enum TypeDefinitionSource {
  PACKAGE_JSON = 'package.json',
  BACKEND = 'backend',
  DEFAULT = 'default',
  REFERENCE = 'reference',
  IMPORT = 'import'
}

export interface TypeDefinitionResult {
  content: string;
  filePath: string;
  source: TypeDefinitionSource;
}

export interface TypesResolveOptions {
  /** 是否启用缓存 */
  cacheEnabled?: boolean;
  /** node_modules 的基础路径 */
  baseUrl?: string;
  /** 类型定义文件路径前缀 */
  pathPrefix?: string;
}

export interface CacheEntry {
  results: TypeDefinitionResult[];
  mainTypePath?: string;
  fullyResolved: boolean;
} 