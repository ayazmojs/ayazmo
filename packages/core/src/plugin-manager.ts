import { RouteOptions } from 'fastify';
import fs from 'fs';
import path from 'path';
import { isValidRoute, listFilesInDirectory } from '@ayazmo/utils';
import { AyazmoInstance } from '@ayazmo/types';
import { AwilixContainer, asFunction } from 'awilix';

export async function loadServicesFromPlugin(pluginsDir: string, fastify: AyazmoInstance, diContainer: AwilixContainer) {
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
    const servicesDir = path.join(pluginsDir, dir, 'services');

    if (fs.existsSync(servicesDir)) {
      const serviceFiles = listFilesInDirectory(servicesDir);

      for (const file of serviceFiles) {

        try {
          // load the service file
          const serviceModule = await import(path.join(servicesDir, file));

          // Check if the default export exists
          if (!serviceModule.default || typeof serviceModule.default !== 'function') {
            fastify.log.error(`The module ${file} does not have a valid default export.`);
            continue;
          }

          const serviceName = file.replace(/\.(ts|js)$/, '');

          // Register the service in the DI container
          diContainer.register({
            [serviceName]: asFunction(
              (cradle) => new serviceModule.default(cradle, {})
            ).singleton(),
          })

          fastify.log.info(`Registered service ${serviceName}`);
        } catch (error) {
          fastify.log.error(`Error while loading service ${file}: ${error}`);
        }
      }

    } else {
      fastify.log.info(`services folder not found in plugin directory: ${servicesDir}`);
    }
  }
}

export async function loadRoutesFromPlugin(pluginsDir: string, fastify: AyazmoInstance) {
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
