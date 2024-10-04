// export utility functions to downgrade migrations from mikro orm.
// you can use this to downgrade migrations from the command line.
// you can down grade without parameters to downgrade one level or you can downgrade to a specific migration.

import {
  initDatabase,
  importGlobalConfig,
  ENTITIES_JS_PATH,
  ENTITIES_TS_PATH
} from '@ayazmo/utils'
import {
  Migrator,
  MigrationObject,
  MigrateOptions,
  UmzugMigration,
  MikroORM
} from '@ayazmo/types'
import {
  discoverMigrationFiles,
  discoverPublicPaths
} from '@ayazmo/core'
import CliLogger from './cli-logger.js'

export async function downMigrations (options?: string | string[] | MigrateOptions): Promise<UmzugMigration[]> {
  let orm: MikroORM | null = null

  try {
    const globalConfig = await importGlobalConfig()

    if (!Array.isArray(globalConfig.plugins) || globalConfig.plugins.length === 0) {
      throw new Error('No plugins enabled!')
    }

    const publicPaths = discoverPublicPaths(globalConfig.plugins)
    const migrationClasses: MigrationObject[] = await discoverMigrationFiles([...publicPaths.migrations])

    const entities = [ENTITIES_JS_PATH]

    if (entities.length === 0) {
      throw new Error('No database entities found.')
    }

    orm = await initDatabase({
      ...{
        entities,
        entitiesTs: [ENTITIES_TS_PATH],
        baseDir: process.cwd(),
        migrations: {
          snapshot: false,
          migrationsList: migrationClasses ?? [],
          disableForeignKeys: false
        }
      },
      ...globalConfig.database
    })

    const migrator: Migrator = orm.getMigrator()

    if (options != null) {
      return await migrator.down(options)
    } else {
      return await migrator.down()
    }
  } catch (error) {
    CliLogger.error(error)
    throw error
  } finally {
    if (orm != null) await orm.close()
  }
}
