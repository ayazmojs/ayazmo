import { AyazmoInstance } from '@ayazmo/types';
import { AwilixContainer, asValue } from 'awilix';
import fs from 'node:fs';
import path from 'node:path';
import { listFilesInDirectory } from '../plugins/plugin-manager';
import { MikroORM } from '@mikro-orm/postgresql';
import { RequestContext } from '@mikro-orm/core';

export async function loadEntities(fastify: AyazmoInstance, diContainer: AwilixContainer, entitiesPath: string): Promise<void> {
  if (!fs.existsSync(entitiesPath)) {
    fastify.log.info(` - Entities directory not found in plugin: ${entitiesPath}`);
    return;
  }

  let entities: any[] = [];

  try {

    const entitiesFiles = listFilesInDirectory(entitiesPath);

    for (const file of entitiesFiles) {
      // load the service file
      const entityModule = await import(path.join(entitiesPath, file));

      // Check if the default export exists
      if (!entityModule.default || typeof entityModule.default !== 'function') {
        fastify.log.error(` - The module ${file} does not have a valid default export.`);
        continue;
      }

      entities.push(entityModule.default);
    }

  } catch (error) {

  }

  const config = diContainer.resolve('config');

  try {
    const db = await MikroORM.init({
      discovery: { disableDynamicFileAccess: true },
      debug: false,
      tsNode: false,
      driverOptions: {
        connection: { ssl: true }
      },
      entities: entities ?? [],
      ...config.database
    });

    // check connection
    const isConnected = await db.isConnected();
    if (!isConnected) {
      fastify.log.error(' - Database connection failed');
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
    fastify.log.error(` - Error while loading entities: ${error}`);
  }

}