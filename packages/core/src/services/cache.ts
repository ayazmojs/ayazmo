// create a cache service on top of async-cache-dedupe by abstracting all possible cache operations using a single interface
import { Cache, createCache } from 'async-cache-dedupe'
import { 
  AppConfig, 
  AyazmoInstance, 
  ICacheService, 
  CacheDefineOptions 
} from '@ayazmo/types'
import { AyazmoCoreService } from '../interfaces/AyazmoCoreService.js'

/**
 * Cache service implementation using async-cache-dedupe
 * This is the default implementation used by the Ayazmo framework
 */
export default class CacheService extends AyazmoCoreService implements ICacheService {
  private readonly cache: Cache

  constructor (app: AyazmoInstance, appConfig: AppConfig) {
    super(app, appConfig)
    const config = this.getGlobalConfig()
    const appCacheConfig = config.app.cache
    
    // Skip initialization if cache is disabled
    if (!appCacheConfig?.enabled) {
      this.app.log.info('Cache service is disabled')
      return
    }

    try {
      // Map our config format to async-cache-dedupe format
      const cacheOptions: any = {
        ttl: appCacheConfig.ttl,
        stale: appCacheConfig.stale
      }

      // Configure storage based on type
      if (appCacheConfig.storage.type === 'redis') {
        if (!app.redis) {
          throw new Error('Redis client is required for Redis cache storage but is not available')
        }
        
        cacheOptions.storage = {
          type: 'redis',
          options: {
            ...appCacheConfig.storage.options,
            client: app.redis
          }
        }
      } else if (appCacheConfig.storage.type === 'memory') {
        cacheOptions.storage = {
          type: 'memory',
          options: appCacheConfig.storage.options
        }
      } else {
        throw new Error(`Unsupported cache storage type: ${appCacheConfig.storage.type}`)
      }
      
      // Create cache instance
      this.cache = createCache(cacheOptions)
      this.app.log.info(`Cache service initialized with ${appCacheConfig.storage.type} storage`)
    } catch (err) {
      this.app.log.error(`Failed to initialize cache service: ${err.message}`)
      throw err
    }
  }

  /**
   * Get a cached value by key and options
   * @param cacheKey The cache function key (defined function name)
   * @param args Arguments to pass to the cached function
   * @returns The cached value or throws if not found
   */
  async get(cacheKey: string, args?: any): Promise<any> {
    try {
      if (!this.cache) {
        throw new Error('Cache service is not initialized')
      }
      
      if (typeof this.cache[cacheKey] !== 'function') {
        throw new Error(`Cache: ${cacheKey} is not a function.`)
      }
      
      return await this.cache[cacheKey](args)
    } catch (err) {
      this.app.log.error(`Cache get error for key ${cacheKey}: ${err.message}`)
      throw err
    }
  }

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
  ): void {
    try {
      if (!this.cache) {
        throw new Error('Cache service is not initialized')
      }
      
      // Only define if not already defined
      if (typeof this.cache[cacheKey] !== 'function') {
        this.cache.define(cacheKey, options, fetcher)
      }
    } catch (err) {
      this.app.log.error(`Cache define error for key ${cacheKey}: ${err.message}`)
      throw err
    }
  }

  /**
   * Get a value from cache or define and execute it if not present
   * @param cacheKey Unique name for the cacheable function
   * @param options Cache options
   * @param fetcher Function to compute the value if not in cache
   * @param args Arguments to pass to the fetcher
   * @returns The cached or computed value
   */
  async getOrSet<T = any>(
    cacheKey: string, 
    options: CacheDefineOptions,
    fetcher: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<T> {
    try {
      // Define the function if it doesn't exist
      this.define(cacheKey, options, fetcher)
      
      // Get the cached result or compute new value
      return await this.get(cacheKey, args)
    } catch (err) {
      this.app.log.error(`Cache getOrSet error for key ${cacheKey}: ${err.message}`)
      
      // If cache fails, execute the fetcher directly as fallback
      try {
        return await fetcher(...args)
      } catch (fetcherErr) {
        this.app.log.error(`Fetcher execution error for key ${cacheKey}: ${fetcherErr.message}`)
        throw fetcherErr
      }
    }
  }

  /**
   * Clear the entire cache or a specific key with arguments
   * @param name Optional key name to clear
   * @param arg Optional arguments for the key
   */
  clear(name?: string, arg?: unknown): void {
    try {
      if (!this.cache) {
        throw new Error('Cache service is not initialized')
      }
      
      if (name) {
        if (arg !== undefined) {
          this.cache.clear(name, arg)
        } else {
          this.cache.clear(name)
        }
      } else {
        this.cache.clear()
      }
      
      this.app.log.debug(`Cache cleared${name ? ` for key ${name}` : ''}`)
    } catch (err) {
      this.app.log.error(`Cache clear error${name ? ` for key ${name}` : ''}: ${err.message}`)
      throw err
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param references Pattern or array of patterns to invalidate
   * 
   * Example:
   * ```typescript
   * // invalidate user:1 reference
   * cacheService.invalidateAll('user:1')
   *
   * // invalidate all user references
   * cacheService.invalidateAll('user:*')
   * ```
   */
  invalidateAll(references: string | string[]): void {
    try {
      if (!this.cache) {
        throw new Error('Cache service is not initialized')
      }
      
      this.cache.invalidateAll(references)
      
      const refsDisplay = Array.isArray(references) 
        ? references.join(', ') 
        : references
      
      this.app.log.debug(`Cache invalidated for references: ${refsDisplay}`)
    } catch (err) {
      this.app.log.error(`Cache invalidation error: ${err.message}`)
      throw err
    }
  }
}
