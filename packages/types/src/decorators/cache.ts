import { CacheOptions } from '../services/cache.js';

/**
 * Options for the @Cacheable decorator
 */
export interface CacheableOptions extends CacheOptions {
  /**
   * Custom key generator function
   * If not provided, will use default key generation based on class name, method name, and arguments
   */
  keyGenerator?: (...args: any[]) => string;
  
  /**
   * Cache references for invalidation
   * Example: ['user:1', 'posts:*']
   */
  references?: string | string[];
  
  /**
   * Condition to determine if result should be cached
   * Return true to cache, false to skip caching
   */
  condition?: (result: any) => boolean;
  
  /**
   * Cache key prefix, will be combined with the generated key
   * Useful for namespacing cache entries
   */
  keyPrefix?: string;
}

/**
 * Cache eviction options for the @CacheEvict decorator
 */
export interface CacheEvictOptions {
  /**
   * Key to invalidate - if not provided, will use the method name
   */
  key?: string;
  
  /**
   * Pattern or array of patterns to invalidate
   * Example: ['user:*', 'posts:recent']
   */
  patterns?: string | string[];
  
  /**
   * If true, will invalidate all cache entries
   */
  allEntries?: boolean;
  
  /**
   * If true, will invalidate before method execution
   * If false, will invalidate after method execution
   */
  beforeInvocation?: boolean;
  
  /**
   * Key generator for dynamic invalidation based on method arguments
   */
  keyGenerator?: (...args: any[]) => string | string[];
} 