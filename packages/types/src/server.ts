import { FastifyInstance, RouteOptions, preHandlerHookHandler } from 'fastify';
import { AwilixContainer } from 'awilix';
import http from 'http';

export interface AyazmoRouteOptions extends RouteOptions {
  
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
  }
}

export type AyazmoInstance = FastifyInstance<
  http.Server,
  http.IncomingMessage,
  http.ServerResponse,
  any
>;