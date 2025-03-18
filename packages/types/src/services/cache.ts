/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  
  /** Stale-while-revalidate time in seconds */
  stale?: number;
}

/**
 * Options for defining a cacheable function
 */
export interface CacheDefineOptions extends CacheOptions {
  /** Function to use for cache key generation from args */
  keyGenerator?: (...args: any[]) => string;
}

/**
 * Interface defining the core cache service functionality
 */
export interface ICacheService {
  /**
   * Get a cached value by key and options
   * @param cacheKey The cache function key (defined function name)
   * @param args Arguments to pass to the cached function
   * @returns The cached value or throws if not found
   */
  get(cacheKey: string, args?: any): Promise<any>;
  
  /**
   * Define a cacheable function
   * @param cacheKey Unique name for the cacheable function
   * @param options Cache options
   * @param fetcher Function to compute the value if not in cache
   */
  define<T = any>(
    cacheKey: string, 
    options: CacheDefineOptions, 
    fetcher: (...args: any[]) => Promise<T>
  ): void;
  
  /**
   * Get a value from cache or define and execute it if not present
   * @param cacheKey Unique name for the cacheable function
   * @param options Cache options
   * @param fetcher Function to compute the value if not in cache
   * @param args Arguments to pass to the fetcher
   * @returns The cached or computed value
   */
  getOrSet<T = any>(
    cacheKey: string, 
    options: CacheDefineOptions,
    fetcher: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<T>;
  
  /**
   * Clear the entire cache or a specific key with arguments
   * @param name Optional key name to clear
   * @param arg Optional arguments for the key
   */
  clear(name?: string, arg?: unknown): void;
  
  /**
   * Invalidate cache entries by pattern
   * @param references Pattern or array of patterns to invalidate
   */
  invalidateAll(references: string | string[]): void;
} 