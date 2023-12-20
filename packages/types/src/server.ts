import { FastifyInstance, RouteOptions } from 'fastify';
import http from 'http';

// Define the type for the Fastify instance with the custom logger
export type AyazmoInstance = FastifyInstance<
  http.Server, 
  http.IncomingMessage, 
  http.ServerResponse, 
  any
>;

export type AyazmoRouteOptions = RouteOptions;