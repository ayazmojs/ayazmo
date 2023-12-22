import { AyazmoInstance } from '@ayazmo/types';
import fs from 'fs';
import path from 'path';
import { RouteOptions } from 'fastify';
import { isValidRoute } from '@ayazmo/utils';

export async function loadRoutes (pluginsDir: string, fastify: AyazmoInstance) {
  if (!fs.existsSync(pluginsDir)) {
    fastify.log.info('Plugins directory not found, skipping plugin loading.');
    return;
  }

  const pluginDirs = fs.readdirSync(pluginsDir);

  // Check if the directory is empty
  if (pluginDirs.length === 0) {
    fastify.log.info('No plugins found, skipping plugin loading.');
    return;
  }

  for (const dir of pluginDirs) {
    const routesPath = path.join(pluginsDir, dir, 'routes.js');
    if (fs.existsSync(routesPath)) {
      const routesModule = await import(routesPath);

      if (routesModule.default && Array.isArray(routesModule.default)) {
        routesModule.default.forEach((route: RouteOptions) => {
          if (isValidRoute(route)) {
            fastify.route(route);
            fastify.log.info(`Registered route ${route.method} ${route.url}`)
          } else {
            fastify.log.error(`Invalid route detected in ${dir}`);
          }
        });
      } else {
        fastify.log.error(`No default export (array of routes) found in ${routesPath}`);
      }
    } else {
      fastify.log.error(`Routes file not found in plugin directory: ${dir}`);
    }
  }
}