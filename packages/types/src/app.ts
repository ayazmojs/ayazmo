
import { Options } from "@mikro-orm/core";

export interface PluginRoutes {
  [key: string]: {
    hooks?: (...args: any[]) => any;
  };
}

export type PluginSettings = {
  private?: boolean;
  routes?: PluginRoutes
}

export type PluginConfig = {
  name: string;
  settings: PluginSettings;
}

export type AyazmoAppConfig = {
  eventEmitterType: 'memory' | 'redis'
}

export type AppConfig = {
  plugins: PluginConfig[];
  database: Options & {
    type: 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mongodb';
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