import { TypeDefinitionResult, CacheEntry } from './types';
/**
 * Memory cache for storing type definitions
 */
export declare class MemoryCache {
    private prefix;
    private cache;
    constructor(prefix?: string);
    /**
     * Get cache key for package
     * @param packageName Package name
     * @returns Cache key
     */
    private getKey;
    /**
     * Get cached entry for package
     * @param packageName Package name
     * @returns Cached entry or null
     */
    getItem(packageName: string): CacheEntry | null;
    /**
     * Set cache entry for package
     * @param packageName Package name
     * @param results Type definition results
     * @param mainTypePath Main type file path
     */
    set(packageName: string, results: TypeDefinitionResult[], mainTypePath?: string): void;
    /**
     * Clear all cache entries
     */
    clear(): void;
}
