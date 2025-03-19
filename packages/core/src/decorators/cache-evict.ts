import { AyazmoInstance, CacheEvictOptions, ICacheService } from '@ayazmo/types';

// Reference to the app instance from cacheable.ts
declare let _app: AyazmoInstance | null;

/**
 * Get the cache service instance
 */
function getCacheService(): ICacheService {
  if (!_app) {
    throw new Error('CacheEvict decorator not initialized. Make sure initCacheableDecorator() is called.');
  }
  return _app.diContainer.resolve('cacheService');
}

/**
 * Decorator to evict cache entries when a method is called
 * @param options Cache eviction options
 */
export function CacheEvict(options: CacheEvictOptions = {}) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    if (typeof originalMethod !== 'function') {
      throw new Error('@CacheEvict can only be applied to methods');
    }
    
    descriptor.value = async function(...args: any[]) {
      try {
        if (options.beforeInvocation) {
          invalidateCache(target, propertyKey, args, options);
        }
        
        // Call the original method
        const result = await originalMethod.apply(this, args);
        
        if (!options.beforeInvocation) {
          invalidateCache(target, propertyKey, args, options);
        }
        
        return result;
      } catch (error) {
        // If there's an error during the original method, still run cache invalidation
        // if it was meant to happen after method execution
        if (!options.beforeInvocation) {
          try {
            invalidateCache(target, propertyKey, args, options);
          } catch (cacheError) {
            _app?.log.error(`[CACHE] Error during cache invalidation: ${cacheError.message}`);
          }
        }
        
        throw error; // Re-throw the original error
      }
    };
    
    return descriptor;
  };
}

/**
 * Helper to invalidate cache based on options
 */
function invalidateCache(
  target: any,
  methodName: string,
  args: any[],
  options: CacheEvictOptions
) {
  try {
    const cacheService = getCacheService();
    const className = target.constructor.name;
    
    _app?.log.debug(`[CACHE] Running cache invalidation for ${className}.${methodName}`);
    
    if (options.allEntries) {
      _app?.log.debug(`[CACHE] Clearing entire cache`);
      cacheService.clear();
      return;
    }
    
    if (options.patterns) {
      _app?.log.debug(`[CACHE] Invalidating by patterns: ${Array.isArray(options.patterns) ? options.patterns.join(', ') : options.patterns}`);
      cacheService.invalidateAll(options.patterns);
      return;
    }
    
    if (options.keyGenerator) {
      const keys = options.keyGenerator(...args);
      if (Array.isArray(keys)) {
        _app?.log.debug(`[CACHE] Invalidating generated keys: ${keys.join(', ')}`);
        cacheService.invalidateAll(keys);
      } else {
        _app?.log.debug(`[CACHE] Clearing generated key: ${keys}`);
        cacheService.clear(keys);
      }
      return;
    }
    
    if (options.key) {
      _app?.log.debug(`[CACHE] Clearing specific key: ${options.key}`);
      cacheService.clear(options.key);
      return;
    }
    
    // Default: invalidate by method name
    const defaultKey = `${className}:${methodName}`;
    _app?.log.debug(`[CACHE] Clearing default key: ${defaultKey}`);
    cacheService.clear(defaultKey);
  } catch (error) {
    _app?.log.error(`[CACHE] Error during cache invalidation: ${error.message}`);
    console.error(`Cache invalidation error in ${target.constructor.name}.${methodName}:`, error);
    throw error;
  }
} 