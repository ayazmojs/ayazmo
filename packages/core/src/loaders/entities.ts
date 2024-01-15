import { AyazmoInstance } from '@ayazmo/types';
import fs from 'node:fs';
import path from 'node:path';
import { listFilesInDirectory } from '../plugins/plugin-manager.js';
import { isDefaultExport, AnyEntity } from '@ayazmo/utils';

export async function loadEntities(app: AyazmoInstance, entitiesPath: string): Promise<AnyEntity[]> {
  if (!fs.existsSync(entitiesPath)) {
    app.log.info(` - Entities directory not found in plugin: ${entitiesPath}`);
    return [];
  }

  let entities: any[] = [];

  try {

    const entitiesFiles: string[] = await listFilesInDirectory(entitiesPath);

    for (const file of entitiesFiles) {
      // load the entities module
      const entityModule = await import(path.join(entitiesPath, file));

      // Check if the default export exists
      if (!isDefaultExport(entityModule)) {
        app.log.error(` - The module ${file} does not have a valid default export.`);
        continue;
      }

      entities.push(entityModule.default);
    }
    app.log.info(` - Loaded ${entities.length} entities.`);
    return entities;

  } catch (error) {
    app.log.error(` - Error while loading entities: ${error}`);
    return [];
  }
}