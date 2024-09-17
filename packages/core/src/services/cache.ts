// create a cache service on top of async-cache-dedupe by abstracting all possible cache operations using a single interface
import { Cache, createCache } from 'async-cache-dedupe'
import { AppConfig, AyazmoInstance } from '@ayazmo/types'
import { AyazmoCoreService } from '../interfaces/AyazmoCoreService.js'

export default class CacheService extends AyazmoCoreService {
  private cache: Cache

  constructor(app: AyazmoInstance, appConfig: AppConfig) {
    super(app, appConfig)
    const config = app.diContainer.resolve('config') as AppConfig
    const appCacheConfig = config.app.cache
    if (appCacheConfig && appCacheConfig.storage.type === 'redis') {
      appCacheConfig.storage.options.client = app.redis;
    }
    this.cache = createCache(appCacheConfig)
  }

  async get(cacheKey: string, opts: any): Promise<any> {
    if (typeof this.cache[cacheKey] === 'function') {
      return this.cache[cacheKey](opts);
    }
    throw new Error(`Cache: ${cacheKey} is not a function.`);
  }

  async getOrSet(cacheKey: string, opts: any, fetcher: (arg: any) => Promise<any>): Promise<any> {
    this.define(cacheKey, opts, fetcher)
    return this.get(cacheKey, opts)
  }

  define(cacheKey: string, opts: any, fetcher: (arg: any) => Promise<any>): void {
    if (typeof this.cache[cacheKey] !== 'function') {
      this.cache.define(cacheKey, opts, fetcher);
    }
  }

  clear(name?: string, arg?: any): void {
    if (name) {
      if (arg !== undefined) {
        this.cache.clear(name, arg);
      } else {
        this.cache.clear(name);
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Invalidate the whole cache storage
   * 
   * Example:
   * ```typescript
   * // invalidate user:1 reference
   * cacheService.invalidateAll('user:1')
   * 
   * // invalidate all user references
   * cacheService.invalidateAll('user:*')
   * ```
   * @param references 
   */
  invalidateAll(references: string | string[]): void {
    this.cache.invalidateAll(references);
  }
}