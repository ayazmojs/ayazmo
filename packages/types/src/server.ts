import { FastifyInstance, RouteOptions, preHandlerHookHandler, FastifyServerOptions } from 'fastify';
import { AwilixContainer } from 'awilix';
import http from 'http';
import { AyazmoContainer } from './app.js';

export interface AyazmoRouteOptions extends RouteOptions {
  
}

export interface ServerOptions extends FastifyServerOptions {
  configPath?: string;
}

interface User {
  id: string;
  [key: string]: any;
}

interface Admin {
  id: string;
  [key: string]: any;
}

declare module 'fastify' {
  export interface FastifyRequest {
    diScope: AwilixContainer;
    cookies: { [cookieName: string]: string | undefined };
    user: User;
    admin:Admin;
  }
  export interface FastifyInstance {
    auth: preHandlerHookHandler;
    anonymousStrategy: preHandlerHookHandler;
    userAuthChain: preHandlerHookHandler;
    adminAuthChain: preHandlerHookHandler,
    redis: any;
    configPath: string;
  }
}

// export type AyazmoInstance = FastifyInstance<
//   http.Server,
//   http.IncomingMessage,
//   http.ServerResponse,
//   any
// >;

export interface AyazmoInstance extends FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> {
  diContainer: AyazmoContainer;
}