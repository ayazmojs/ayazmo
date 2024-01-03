import { AyazmoInstance } from '@ayazmo/types';
import fs from 'fs';
import { RouteOptions } from 'fastify';
import { isValidRoute } from '../utils/route-validator';

export async function loadRoutes (fastify: AyazmoInstance, path: string): Promise<void> {
  if (!fs.existsSync(path)) {
    fastify.log.info(` - Routes file not found in plugin directory: ${path}`);
    return;
  }

  const routesModule = await import(path);

  if (routesModule.default && Array.isArray(routesModule.default)) {
    routesModule.default.forEach((route: RouteOptions) => {
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
}