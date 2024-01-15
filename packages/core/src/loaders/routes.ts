import { AyazmoInstance } from '@ayazmo/types';
import fs from 'node:fs';
import { RouteOptions } from 'fastify';
import { isValidRoute } from '../utils/route-validator.js';

export async function loadRoutes(fastify: AyazmoInstance, path: string): Promise<void> {
  if (!fs.existsSync(path)) {
    fastify.log.info(` - Routes file not found in plugin directory: ${path}`);
    return;
  }

  fastify
    .after(async () => {
      const routesModule = await import(path);

      // Check if the default export exists
      if (!routesModule.default) {
        fastify.log.error(` - The module ${path} does not have a valid default export. Skipping...`);
      } else {
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
      }
    })
}