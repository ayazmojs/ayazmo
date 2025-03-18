import { Options, MikroORM, Dictionary, FilterQuery, AnyEntity } from '@mikro-orm/core'
import { FastifyCorsOptions } from '@fastify/cors'
import { AwilixContainer } from 'awilix'
import { FastifyListenOptions, RegisterOptions } from 'fastify'
import { QueueOptions, WorkerOptions } from 'bullmq'
import { AyazmoInstance, AyazmoRouteOptions } from './server'

export interface PluginRoutes {
  enabled?: boolean
  routes?: AyazmoRouteOptions[] | ((app: AyazmoInstance) => AyazmoRouteOptions[])
}

export interface PluginSettings {
  private?: boolean
  routes?: PluginRoutes
  filters?: {
    [key: string]: Dictionary | ((args: Dictionary) => Promise<FilterQuery<AnyEntity>> | FilterQuery<AnyEntity>)
  }
  onBeforePublish?: (event: string, data: any) => Promise<any> | any
  [key: string]: any
}

export interface PluginConfig {
  name: string
  path?: string
  settings: PluginSettings
}

export interface AyazmoQueue {
  name: string
  options?: QueueOptions
  publishOn: string[]
  transformer?: (payload: any, type: string, app: AyazmoInstance) => Promise<any>
  events?: {
    [key: string]: (...args: any[]) => void
  }
}

export interface AyazmoWorker {
  queueName: string
  options: WorkerOptions
  events?: {
    [key: string]: (...args: any[]) => void
  }
}

/**
 * Common options for all cache storage types
 */
export interface CommonCacheStorageOptions {
  /** Key prefix to use for cache keys */
  keyPrefix?: string;
  
  /** Any additional storage-specific options */
  [key: string]: any;
}

export interface CacheStorageOptions {
  /** 
   * Type of storage
   * 'redis' and 'memory' are built-in types
   * Custom implementations can use their own type identifiers
   */
  type: string;
  
  /** Storage-specific options */
  options: CommonCacheStorageOptions;
}

export interface RouteCacheConfig {
  /** Whether route caching is enabled */
  enabled: boolean;
  /** HTTP methods to cache (only GET for first version) */
  methods: string[];
  /** Routes to exclude from caching */
  excludePaths?: string[];
  /** Default TTL for route caching in seconds */
  defaultTtl: number;
  /** Status codes to cache */
  statusCodes?: number[];
}

export interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;
  /** Cache storage configuration */
  storage: CacheStorageOptions;
  /** Global TTL in seconds */
  ttl?: number;
  /** Stale-while-revalidate time in seconds */
  stale?: number;
  /** Route caching configuration */
  routeCaching?: RouteCacheConfig;
}

export interface AyazmoAppConfig {
  server: FastifyListenOptions
  emitter: {
    type: 'memory' | 'redis'
    queues?: AyazmoQueue[]
    workers?: AyazmoWorker[]
  }
  redis: any
  cors: FastifyCorsOptions
  cache: CacheConfig
  enabledAuthProviders: string[]
  onBeforePublish?: (event: string, data: any) => Promise<any> | any
}

export type RoleCheckFunction = (user: any) => boolean

export interface RolesConfig {
  [roleName: string]: RoleCheckFunction
}

export interface RouteRolesConfig {
  [routePath: string]: string[]
}

export interface AyazmoAdminConfig {
  enabled: boolean
  enabledAuthProviders: string[]
  roles: RolesConfig
  routes: RouteRolesConfig
  opts: RegisterOptions
}

export interface AppConfig {
  plugins: PluginConfig[]
  database: Options
  app: AyazmoAppConfig
  admin: AyazmoAdminConfig
}

export interface AdminPluginPaths {
  routes: string
}

export interface PluginPaths {
  services: string
  graphql: string
  entities: string
  routes: string
  migrations: string
  subscribers: string
  bootstrap?: string
  config?: string
  admin: AdminPluginPaths
}

export interface Subscriber {
  event: string
  handler: (...args: any[]) => void
}

export interface IEventEmitter {
  publish: (event: string, data: any, config?: any) => Promise<void>
  subscribe: (event: string, handler: (...args: any[]) => void) => void
  unsubscribe: (event: string, handler: (...args: any[]) => void) => void
}

export interface AyazmoContainer extends AwilixContainer {
  eventService: IEventEmitter
  config: AppConfig
  dbService: MikroORM
  resolve: <T = any>(key: string) => T
}
