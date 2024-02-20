
import { Options } from "@mikro-orm/core";
import { FastifyCorsOptions } from "@ayazmo/core";

export interface PluginRoutes {
  [key: string]: {
    hooks?: (...args: any[]) => any;
  };
}

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
  cors: FastifyCorsOptions,
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
  publish(event: string, data: any): Promise<void>;
  subscribe(event: string, handler: (...args: any[]) => void): void;
  unsubscribe(event: string, handler: (...args: any[]) => void): void;
}