import { AyazmoInstance, PluginConfig } from '@ayazmo/types';
import { AwilixContainer, asFunction } from 'awilix';
import path from 'node:path';
import { globby } from 'globby';

export async function loadServices(
  fastify: AyazmoInstance,
  diContainer: AwilixContainer,
  servicesPath: string,
  pluginSettings: PluginConfig
): Promise<void> {
  const serviceFiles = await globby(`${servicesPath}/*.js`);
  
  if (serviceFiles.length === 0) {
    fastify.log.info(` - No services discovered in ${servicesPath}`);
    return;
  }

  const promises = serviceFiles.map(file => importAndLoadModule(fastify, diContainer, file, pluginSettings));
  await Promise.all(promises);
}

async function importAndLoadModule(
  fastify: AyazmoInstance,
  diContainer: AwilixContainer,
  file: string,
  pluginSettings: PluginConfig
): Promise<void> {
  try {
    // load the service file
    const serviceModule = await import(file);

    // Check if the default export exists
    if (!serviceModule.default || typeof serviceModule.default !== 'function') {
      throw new Error(`The module ${file} does not have a valid default export.`);
    }

    const serviceName = path.basename(file).replace(/\.(ts|js)$/, '') + 'Service';

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