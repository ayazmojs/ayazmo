
import { Options, MikroORM } from "@mikro-orm/core";
import { FastifyCorsOptions } from "@fastify/cors";
import { AwilixContainer } from 'awilix';
import { FastifyListenOptions, RegisterOptions } from "fastify";
import { QueueOptions, WorkerOptions } from 'bullmq';
import { AyazmoInstance, AyazmoRouteOptions } from "./server";
import { Dictionary, FilterQuery, AnyEntity } from '@mikro-orm/core';

export type PluginRoutes = {
  enabled?: boolean;
  routes?: AyazmoRouteOptions[] | ((app: AyazmoInstance) => AyazmoRouteOptions[]);
}

export interface PluginSettings {
  private?: boolean;
  routes?: PluginRoutes;
  filters?: {
    [key: string]: Dictionary | ((args: Dictionary) => Promise<FilterQuery<AnyEntity>> | FilterQuery<AnyEntity>);
  };
  [key: string]: any;
}

export interface PluginConfig {
  name: string;
  path?: string;
  settings: PluginSettings;
}

export type AyazmoQueue = {
  name: string;
  options?: QueueOptions;
  publishOn: string[];
  transformer?: (payload: any, type: string, app: AyazmoInstance) => Promise<any>;
  events?: {
    [key: string]: (...args: any[]) => void;
  };
};

export type AyazmoWorker = {
  queueName: string,
  options: WorkerOptions
  events?: {
    [key: string]: (...args: any[]) => void;
  };
}

export interface AyazmoAppConfig {
  server: FastifyListenOptions,
  emitter: {
    type: 'memory' | 'redis',
    queues?: AyazmoQueue[]
    workers?: AyazmoWorker[]
  },
  redis: any,
  cors: FastifyCorsOptions,
  cache: any,
  enabledAuthProviders: string[],
}

export type RoleCheckFunction = (user: any) => boolean;

export type RolesConfig = {
  [roleName: string]: RoleCheckFunction;
};

export type RouteRolesConfig = {
  [routePath: string]: string[];
};

export interface AyazmoAdminConfig {
  enabled: boolean;
  enabledAuthProviders: string[];
  roles: RolesConfig
  routes: RouteRolesConfig
  opts: RegisterOptions
}

export interface AppConfig {
  plugins: PluginConfig[];
  database: Options;
  app: AyazmoAppConfig;
  admin: AyazmoAdminConfig;
}

export interface AdminPluginPaths {
  routes: string;
}

export interface PluginPaths {
  services: string;
  graphql: string;
  entities: string;
  routes: string;
  migrations: string;
  subscribers: string;
  bootstrap?: string;
  config?: string;
  admin: AdminPluginPaths;
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
  dbService: MikroORM
  resolve<T = unknown>(key: string): T
}