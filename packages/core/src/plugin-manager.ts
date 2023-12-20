import { FastifyInstance, RouteOptions } from 'fastify';
import fs from 'fs';
import path from 'path';
import { isValidRoute } from '@ayazmo/utils';

export async function loadAndRegisterPlugins(fastify: FastifyInstance) {
  const rootDir = process.cwd(); // Get the current working directory
  const pluginsDir = path.join(rootDir, 'dist/plugins'); // Adjust this path as needed

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
