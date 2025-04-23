import { 
  FastifyInstance, 
  RouteOptions, 
  preHandlerHookHandler, 
  FastifyServerOptions, 
  RawServerBase, 
  RawServerDefault, 
  RawRequestDefaultExpression, 
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  FastifyTypeProvider,
  FastifyTypeProviderDefault
} from 'fastify'
import { AwilixContainer } from 'awilix'

// Import fastify plugin type definitions
// These imports are needed to ensure the types are available
// when AyazmoInstance is used
import '@fastify/websocket'

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

// export interface AyazmoInstance extends FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> {
//   diContainer: AwilixContainer
//   userAuthChain: preHandlerHookHandler
//   adminAuthChain: preHandlerHookHandler
// }

export interface AyazmoInstance<
  HttpServer extends RawServerBase = RawServerDefault,
  HttpRequest extends RawRequestDefaultExpression<HttpServer> = RawRequestDefaultExpression<HttpServer>,
  HttpResponse extends RawReplyDefaultExpression<HttpServer> = RawReplyDefaultExpression<HttpServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> extends FastifyInstance<HttpServer, HttpRequest, HttpResponse, Logger, TypeProvider> {
  diContainer: AwilixContainer
  userAuthChain: preHandlerHookHandler
  adminAuthChain: preHandlerHookHandler
}
