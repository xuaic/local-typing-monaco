import { TypeDefinitionResult, CacheEntry } from './types';

/**
 * Memory cache for storing type definitions
 */
export class MemoryCache {
  private prefix: string;
  private cache: Map<string, CacheEntry>;

  constructor(prefix: string = 'typing-cache') {
    this.prefix = prefix;
    this.cache = new Map();
  }

  /**
   * Get cache key for package
   * @param packageName Package name
   * @returns Cache key
   */
  private getKey(packageName: string): string {
    return `${this.prefix}:${packageName}`;
  }

  /**
   * Get cached entry for package
   * @param packageName Package name
   * @returns Cached entry or null
   */
  getItem(packageName: string): CacheEntry | null {
    try {
      const key = this.getKey(packageName);
      return this.cache.get(key) || null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Set cache entry for package
   * @param packageName Package name
   * @param results Type definition results
   * @param mainTypePath Main type file path
   */
  set(
    packageName: string,
    results: TypeDefinitionResult[],
    mainTypePath?: string
  ): void {
    try {
      const key = this.getKey(packageName);
      const entry: CacheEntry = {
        results,
        mainTypePath,
        fullyResolved: true
      };
      this.cache.set(key, entry);
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
} 