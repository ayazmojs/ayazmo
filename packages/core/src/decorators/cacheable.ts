import { AyazmoInstance, CacheableOptions, ICacheService } from '@ayazmo/types';

/**
 * Service locator to retrieve the cache service instance
 * Used by the decorator to avoid circular dependencies
 */
let _app: AyazmoInstance | null = null;

/**
 * Initialize the cacheable decorator with the application instance
 * Must be called during application startup
 */
export function initCacheableDecorator(app: AyazmoInstance): void {
  _app = app;
}

/**
 * Get the cache service instance
 */
function getCacheService(): ICacheService {
  if (!_app) {
    throw new Error('Cacheable decorator not initialized. Call initCacheableDecorator() first.');
  }
  return _app.diContainer.resolve('cacheService');
}

/**
 * Generate a cache key based on the target, method name, and arguments
 */
function generateCacheKey(
  target: any,
  methodName: string,
  args: any[],
  options: CacheableOptions
): string {
  if (options.keyGenerator) {
    return options.keyGenerator(...args);
  }
  
  // Default key generation strategy
  const className = target.constructor.name;
  const prefix = options.keyPrefix ? `${options.keyPrefix}:` : '';
  
  // Handle complex objects in args by using JSON.stringify
  const argsHash = JSON.stringify(args, (key, value) => {
    // Handle special cases like functions, circular references, etc.
    if (typeof value === 'function') {
      return 'function';
    }
    return value;
  });
  
  return `${prefix}${className}:${methodName}:${argsHash}`;
}

/**
 * Decorator to mark a method as cacheable
 * @param options Caching options
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    if (typeof originalMethod !== 'function') {
      throw new Error('@Cacheable can only be applied to methods');
    }
    
    descriptor.value = async function(...args: any[]) {
      try {
        const cacheService = getCacheService();
        
        // Generate unique identifiers
        const cacheKey = generateCacheKey(target, propertyKey, args, options);
        const functionKey = `${target.constructor.name}.${propertyKey}`;
        
        _app?.log.debug(`[CACHE] Looking up cache for ${functionKey} with key ${cacheKey}`);
        
        return await cacheService.getOrSet(
          functionKey,
          {
            ttl: options.ttl,
            stale: options.stale,
            keyGenerator: (...fetcherArgs) => generateCacheKey(target, propertyKey, fetcherArgs, options)
          },
          async (...fetcherArgs) => {
            _app?.log.debug(`[CACHE] Cache miss for ${functionKey}, executing original method`);
            
            const result = await originalMethod.apply(this, fetcherArgs);
            
            // Apply condition if specified
            if (options.condition && !options.condition(result)) {
              _app?.log.debug(`[CACHE] Condition not met for ${functionKey}, skipping cache`);
              throw new Error('SKIP_CACHE');
            }
            
            _app?.log.debug(`[CACHE] Stored result for ${functionKey} in cache`);
            return result;
          },
          ...args
        );
      } catch (error) {
        if (error.message === 'SKIP_CACHE') {
          // If condition failed, just return the original result
          return await originalMethod.apply(this, args);
        }
        
        // Log error and fall back to original method
        _app?.log.error(`[CACHE] Error in ${target.constructor.name}.${propertyKey}: ${error.message}`);
        console.error(`Cache error in ${target.constructor.name}.${propertyKey}:`, error);
        
        return await originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
} 