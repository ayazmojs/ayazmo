
import { Options } from "@mikro-orm/core";

export interface PluginRoutes {
  [key: string]: {
    hooks?: (...args: any[]) => any;
  };
}

export interface PluginSettings {
  private?: boolean;
  routes?: PluginRoutes
}

export interface PluginConfig {
  name: string;
  settings: PluginSettings;
}

export interface AppConfig {
  plugins: PluginConfig[];
  database: Options;
}

export interface PluginPaths {
  services: string;
  graphql: string;
  entities: string;
  routes: string;
  migrations: string;
  subscribers: string;
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