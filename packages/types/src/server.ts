import { FastifyInstance, RouteOptions, preHandlerHookHandler, FastifyServerOptions } from 'fastify'
import { AwilixContainer } from 'awilix'
import http from 'http'

export type AyazmoRouteOptions = RouteOptions

export interface ServerOptions extends FastifyServerOptions {
  configPath?: string
}

interface User {
  id: string
  [key: string]: any
}

interface Admin {
  id: string
  [key: string]: any
}

declare module 'fastify' {
  export interface FastifyRequest {
    diScope: AwilixContainer
    cookies: { [cookieName: string]: string | undefined }
    user: User
    admin: Admin
  }
  export interface FastifyInstance {
    auth: preHandlerHookHandler
    anonymousStrategy: preHandlerHookHandler
    userAuthChain: preHandlerHookHandler
    adminAuthChain: preHandlerHookHandler
    redis: any
    configPath: string
  }
}

export interface AyazmoInstance extends FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> {
  diContainer: AwilixContainer
  userAuthChain: preHandlerHookHandler
  adminAuthChain: preHandlerHookHandler
}
