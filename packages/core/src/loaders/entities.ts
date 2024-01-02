import { AyazmoInstance } from '@ayazmo/types';
import { AwilixContainer, asValue } from 'awilix';
import fs from 'fs';
import path from 'path';
import { listFilesInDirectory } from '@ayazmo/utils';
import { MikroORM } from '@mikro-orm/postgresql';
import { RequestContext } from '@mikro-orm/core';

export async function loadEntities(pluginsDir: string, fastify: AyazmoInstance, diContainer: AwilixContainer) {
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

  let entities: any[] = [];

  for (const dir of pluginDirs) {
    const entitiesDir = path.join(pluginsDir, dir, 'entities');

    if (!fs.existsSync(entitiesDir)) {
      fastify.log.info(`Entities directory not found in plugin: ${entitiesDir}`);
      continue;
    }

    try {

      const entitiesFiles = listFilesInDirectory(entitiesDir);

      for (const file of entitiesFiles) {
        // load the service file
        const entityModule = await import(path.join(entitiesDir, file));

        // Check if the default export exists
        if (!entityModule.default || typeof entityModule.default !== 'function') {
          fastify.log.error(`The module ${file} does not have a valid default export.`);
          continue;
        }

        entities.push(entityModule.default);
      }

    } catch (error) {

    }
  }

  const config = diContainer.resolve('config');

  try {
    const db = await MikroORM.init({
      entities: entities ?? [],
      ...config.database
    });

    // check connection
    const isConnected = await db.isConnected();
    if (!isConnected) {
      fastify.log.error('Database connection failed');
    }

    // register request context hook
    fastify.addHook('onRequest', (request, reply, done) => {
      RequestContext.create(db.em, done);
    });

    // shut down the connection when closing the app
    fastify.addHook('onClose', async () => {
      await db.close()
    });

    // register the db instance in the DI container
    diContainer.register({
      db: asValue(db),
    })
  } catch (error) {
    fastify.log.error(`Error while loading entities: ${error}`);
  }

}