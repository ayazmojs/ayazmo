
import { Options } from "@mikro-orm/core";
import { FastifyCorsOptions } from "@fastify/cors";
import { AwilixContainer } from 'awilix';

export interface PluginRoutesCustom {
  enabled?: boolean;
}

export interface PluginRoutesHooks {
  [key: string]: {
    hooks?: (...args: any[]) => any;
  };
}

export type PluginRoutes = PluginRoutesCustom & PluginRoutesHooks;

export interface PluginSettings {
  private?: boolean;
  routes?: PluginRoutes;
  [key: string]: any;
}

export interface PluginConfig {
  name: string;
  settings: PluginSettings;
}

export interface AyazmoAppConfig {
  eventEmitterType: 'memory' | 'redis',
  redis: any,
  cors: FastifyCorsOptions,
  cache: any,
  enabledAuthProviders: any[],
}

export interface AppConfig {
  plugins: PluginConfig[];
  database: Options & {
    type: 'postgresql' | 'mysql' | 'mariadb' | 'sqlite';
  };
  app: AyazmoAppConfig;
}

export interface PluginPaths {
  services: string;
  graphql: string;
  entities: string;
  routes: string;
  migrations: string;
  subscribers: string;
  bootstrap?: string;
}

export interface Subscriber {
  event: string;
  handler: (...args: any[]) => void;
}

export interface IEventEmitter {
  publish(event: string, data: any, config?: any): Promise<void>;
  subscribe(event: string, handler: (...args: any[]) => void): void;
  unsubscribe(event: string, handler: (...args: any[]) => void): void;
}

export type AyazmoContainer = AwilixContainer & {
  eventService: IEventEmitter
  config: AppConfig
  resolve<T = unknown>(key: string): T
}