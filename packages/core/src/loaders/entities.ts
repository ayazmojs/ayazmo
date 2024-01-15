import { AyazmoInstance } from '@ayazmo/types';
import { globby } from 'globby';
import { isDefaultExport, AnyEntity } from '@ayazmo/utils';

export async function loadEntities(app: AyazmoInstance, entitiesPath: string): Promise<AnyEntity[]> {

  try {

    const entitiesFiles: string[] = await globby(`${entitiesPath}/*js`);

    if (entitiesFiles.length === 0) {
      app.log.info(` - No entities found in ${entitiesPath}`);
      return [];
    }

    const entitiesPromises = entitiesFiles.map(async (file) => {
      const entityModule = await import(file);
      if (!isDefaultExport(entityModule)) {
        app.log.error(` - The module ${file} does not have a valid default export.`);
        return null;
      }
      return entityModule.default;
    });

    const entities = (await Promise.all(entitiesPromises)).filter(entity => entity !== null);

    app.log.info(` - Loaded ${entities.length} entities.`);
    return entities;

  } catch (error) {
    app.log.error(` - Error while loading entities: ${error}`);
    return [];
  }
}