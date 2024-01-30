import { FastifyInstance, RouteOptions } from 'fastify';
import { AwilixContainer } from 'awilix';
import http from 'http';
import { FastifyAuthFunction } from '@fastify/auth';

export type AyazmoInstance = FastifyInstance<
  http.Server,
  http.IncomingMessage,
  http.ServerResponse,
  any
>;

export type AyazmoRouteOptions = RouteOptions;

declare module 'fastify' {
  export interface FastifyRequest {
    diScope: AwilixContainer;
    auth: FastifyAuthFunction;
    user: any;
  }
}