import { FastifyInstance, RouteOptions, FastifyRequest, FastifyReply } from 'fastify';
import { AwilixContainer } from 'awilix';
import http from 'http';

export type AyazmoInstance = FastifyInstance<
  http.Server,
  http.IncomingMessage,
  http.ServerResponse,
  any
>;

export type AyazmoRouteOptions = RouteOptions;

export interface AyazmoRequest extends FastifyRequest {
  diScope: AwilixContainer;
}

export interface AyazmoReply extends FastifyReply {

}