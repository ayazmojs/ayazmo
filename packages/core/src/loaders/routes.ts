import { AyazmoInstance } from '@ayazmo/types';
import fs from 'node:fs';
import { RouteOptions } from 'fastify';
import { fastifyAuth } from '@fastify/auth'
import { isValidRoute } from '../utils/route-validator.js';
import { validateJwtStrategy } from '../auth/JwtStrategy.js';
import { validateApitokenStrategy } from '../auth/ApiTokenStrategy.js';
import { validatePasswordStrategy } from '../auth/PasswordStrategy.js';

export async function loadRoutes(fastify: AyazmoInstance, path: string): Promise<void> {
  if (!fs.existsSync(path)) {
    fastify.log.info(` - Routes file not found in plugin directory: ${path}`);
    return;
  }

  fastify
    .decorate('jwtStrategy', async (request, reply) => {
      await validateJwtStrategy(request, reply);
    })
    .decorate('apiTokenStrategy', async (request, reply) => {
      await validateApitokenStrategy(request, reply);
    })
    .decorate('passwordStrategy', async (request, reply) => {
      await validatePasswordStrategy(request, reply);
    })
    .register(fastifyAuth)
    .after(async () => {
      const routesModule = await import(path);

      if (routesModule.default) {
        let routes = routesModule.default;

        if (typeof routesModule.default === 'function') {
          routes = routesModule.default(fastify);
        }

        routes.forEach((route: RouteOptions) => {
          if (isValidRoute(route)) {
            fastify.route(route);
            fastify.log.info(` - Registered route ${route.method} ${route.url}`)
          } else {
            fastify.log.error(` - Invalid route detected in ${path}`);
          }
        });

      } else {
        fastify.log.error(` - No default export (array of routes) found in ${path}`);
      }
    })
}