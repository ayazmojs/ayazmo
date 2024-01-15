import { AyazmoInstance, PluginConfig, Subscriber } from '@ayazmo/types';
import { AwilixContainer } from 'awilix';
import fs from 'node:fs';
import path from 'node:path';
import { listFilesInDirectory } from '../plugins/plugin-manager.js';

export async function loadSubscribers(
  fastify: AyazmoInstance,
  diContainer: AwilixContainer,
  subscribersPath: string,
  pluginSettings: PluginConfig
  ): Promise<void> {
  if (!fs.existsSync(subscribersPath)) {
    fastify.log.info(` - subscribers folder not found in plugin directory: ${subscribersPath}`);
    return;
  }

  const subscribersFiles = await listFilesInDirectory(subscribersPath);
  const eventService = diContainer.resolve('eventService');

  for (const file of subscribersFiles) {

    try {
      // load the module file
      const module = await import(path.join(subscribersPath, file));

      // Check if the default export exists
      if (!module.default || typeof module.default !== 'function') {
        fastify.log.error(` - The module ${file} does not have a valid default export.`);
        continue;
      }

      const { event, handler } = await module.default(diContainer, pluginSettings) as Subscriber;
      eventService.subscribe(event, handler);

      fastify.log.info(` - Registered subscriber ${module.default.name} on ${event}`);
    } catch (error) {
      fastify.log.error(` - Error while loading module ${file}: ${error}`);
    }
  }
}