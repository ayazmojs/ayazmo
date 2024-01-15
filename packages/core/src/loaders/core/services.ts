import { AyazmoInstance } from '@ayazmo/types';
import { AwilixContainer, asFunction } from 'awilix';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { listFilesInDirectory } from '../../plugins/plugin-manager.js';

export async function loadCoreServices(
  fastify: AyazmoInstance,
  diContainer: AwilixContainer
): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const servicesPath = path.join(__dirname, '..', '..', 'services');

  if (!fs.existsSync(servicesPath)) {
    fastify.log.info(` - services folder not found in ayazmo: ${servicesPath}`);
    return;
  }

  const serviceFiles = await listFilesInDirectory(servicesPath);

  for (const file of serviceFiles) {

    try {
      // load the service file
      const serviceModule = await import(path.join(servicesPath, file));

      // Check if the default export exists
      if (!serviceModule.default || typeof serviceModule.default !== 'function') {
        fastify.log.error(` - The module ${file} does not have a valid default export.`);
        continue;
      }

      const serviceName = file.replace(/\.(ts|js)$/, '') + 'Service';

      // Register the service in the DI container
      diContainer.register({
        [serviceName]: asFunction(
          (cradle) => new serviceModule.default(cradle, {})
        ).singleton(),
      })

      fastify.log.info(` - Registered service ${serviceName}`);
    } catch (error) {
      fastify.log.error(` - Error while loading service ${file}: ${error}`);
    }
  }
}