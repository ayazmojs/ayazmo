// create a cache service on top of async-cache-dedupe by abstracting all possible cache operations using a single interface
import { Cache, createCache } from 'async-cache-dedupe'
import { AyazmoContainer, AppConfig, AyazmoInstance } from '@ayazmo/types'
// import { AwilixContainer } from 'awilix'
import { AyazmoCoreService } from '../interfaces/AyazmoCoreService.js'

export default class CacheService extends AyazmoCoreService {
  private cache: Cache

  constructor(container: AyazmoContainer, appConfig: AppConfig, app: AyazmoInstance) {
    super(container, appConfig, app)
    const appCacheConfig = container.config.app.cache
    if (appCacheConfig.storage.type === 'redis') {
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

// export async function register (fastify: AyazmoInstance, diContainer: AwilixContainer, pluginSettings: PluginSettings): Promise<void> {
//   const cacheService = new CacheService(diContainer, pluginSettings)
//   diContainer.register({
//     cacheService: cacheService
//   })
// }