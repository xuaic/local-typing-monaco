import { TypeDefinitionResult, TypesResolveOptions } from './types';
export declare function normalizePath(path: string): string;
export declare class TypeDefinitionResolver {
    private cache;
    private options;
    /** Hash set to prevent circular references */
    private processedFiles;
    constructor(options?: TypesResolveOptions);
    private getFilePath;
    /**
     * Resolve type definitions for a package
     * @param packageName Package name
     * @returns Type definition results
     */
    resolveTypeDefinition(packageName: string): Promise<TypeDefinitionResult[]>;
    /**
     * Generate default any type definition
     * @param packageName Package name
     * @returns Default type definition result
     */
    private generateDefaultTypings;
    /**
     * Generate default type definition content
     * @param packageName Package name
     * @returns Type definition content
     */
    private generateDefaultTypeDefinition;
    /**
     * Fetch package.json content
     * @param packageName Package name
     * @returns package.json content
     */
    private fetchPackageJson;
    /**
     * Resolve all possible type definition file paths
     * @param packageJson package.json content
     * @returns Array of type definition file paths
     */
    private resolveTypePaths;
    /**
     * Normalize relative path
     * @param currentDir Current directory
     * @param relativePath Relative path
     * @returns Normalized path
     */
    private normalizeRelativePath;
    /**
     * Resolve type file contents
     * @param packageName Package name
     * @param typesPath Type file path
     * @returns Type definition results array
     */
    private resolveTypeFiles;
    /**
     * Resolve type references in file
     * @param content File content
     * @param packageName Package name
     * @param currentPath Current file path
     * @param results Results array
     */
    private resolveReferences;
    /**
     * Resolve import statements in file
     * @param content File content
     * @param packageName Package name
     * @param currentPath Current file path
     * @param results Results array
     */
    private resolveImports;
}
