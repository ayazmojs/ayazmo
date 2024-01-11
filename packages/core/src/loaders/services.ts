import { AyazmoInstance, PluginConfig } from '@ayazmo/types';
import { AwilixContainer, asFunction } from 'awilix';
import fs from 'node:fs';
import path from 'node:path';
import { listFilesInDirectory } from '../plugins/plugin-manager.js';

export async function loadServices(
  fastify: AyazmoInstance,
  diContainer: AwilixContainer,
  servicesPath: string,
  pluginSettings: PluginConfig
  ): Promise<void> {
  if (!fs.existsSync(servicesPath)) {
    fastify.log.info(` - services folder not found in plugin directory: ${servicesPath}`);
    return;
  }

  const serviceFiles = listFilesInDirectory(servicesPath);

  for (const file of serviceFiles) {

    try {
      // load the service file
      const serviceModule = await import(path.join(servicesPath, file));

      // Check if the default export exists
      if (!serviceModule.default || typeof serviceModule.default !== 'function') {
        fastify.log.error(` - The module ${file} does not have a valid default export.`);
        continue;
      }

      const serviceName = file.replace(/\.(ts|js)$/, '');

      // Register the service in the DI container
      diContainer.register({
        [serviceName]: asFunction(
          (cradle) => new serviceModule.default(cradle, pluginSettings)
        ).singleton(),
      })

      fastify.log.info(` - Registered service ${serviceName}`);
    } catch (error) {
      fastify.log.error(` - Error while loading service ${file}: ${error}`);
    }
  }
}