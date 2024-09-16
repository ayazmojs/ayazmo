import { AyazmoInstance, PluginSettings } from '@ayazmo/types'
import { asFunction } from 'awilix'
import path from 'node:path'
import { globby } from 'globby'

export async function loadServices(
  fastify: AyazmoInstance,
  servicesPath: string,
  pluginSettings: PluginSettings
): Promise<void> {
  const serviceFiles = await globby(`${servicesPath}/*.js`)

  if (serviceFiles.length === 0) {
    fastify.log.info(` - No services discovered in ${servicesPath}`)
    return
  }

  const promises = serviceFiles.map(async file => await importAndLoadModule(fastify, file, pluginSettings))
  await Promise.all(promises)
}

async function importAndLoadModule(
  fastify: AyazmoInstance,
  file: string,
  pluginSettings: PluginSettings
): Promise<void> {
  try {
    // Load the service file
    const serviceModule = await import(file)

    // Check for a named loader function in the module
    if (serviceModule.loader && typeof serviceModule.loader === 'function') {
      // If loader function exists, call it with necessary parameters
      await serviceModule.loader(fastify, pluginSettings);
      fastify.log.info(` - Loaded service using custom loader from ${file}`);
    } else if (serviceModule.default && typeof serviceModule.default === 'function') {
      // If no loader function, proceed with default behavior
      const serviceName = path.basename(file).replace(/\.(ts|js|mjs)$/, '') + 'Service';

      // Register the service in the DI container
      fastify.diContainer.register({
        [serviceName]: asFunction(
          (cradle) => new serviceModule.default(cradle, pluginSettings, fastify)
        ).singleton()
      });

      fastify.log.info(` - Registered service ${serviceName}`);
    } else {
      throw new Error(`The module ${file} does not have a valid loader or default export.`);
    }
  } catch (error) {
    fastify.log.error(` - Error while loading service ${file}: ${error}`);
  }
}
