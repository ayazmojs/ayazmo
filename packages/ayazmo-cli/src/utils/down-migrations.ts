// export utility functions to downgrade migrations from mikro orm.
// you can use this to downgrade migrations from the command line.
// you can down grade without parameters to downgrade one level or you can downgrade to a specific migration.

import {
  initDatabase,
  importGlobalConfig,
  loadEnvironmentVariables
} from '@ayazmo/utils'
import {
  Migrator,
  MigrationObject,
  MigrateOptions,
  UmzugMigration,
  MikroORM,
  MikroORMOptions,
  IDatabaseDriver,
  Connection,
  EntityManager
} from '@ayazmo/types'
import {
  discoverMigrationFiles,
  discoverPublicPaths
} from '@ayazmo/core'
import CliLogger from './cli-logger.js'
import { resolveSchema } from './migration-utils.js'

export async function downMigrations (options?: string | string[] | MigrateOptions): Promise<UmzugMigration[]> {
  loadEnvironmentVariables()
  let orm: MikroORM | null = null

  try {
    const globalConfig = await importGlobalConfig()

    if (!Array.isArray(globalConfig.plugins) || globalConfig.plugins.length === 0) {
      throw new Error('No plugins enabled!')
    }

    const publicPaths = discoverPublicPaths(globalConfig.plugins)
    const migrationClasses: MigrationObject[] = await discoverMigrationFiles([...publicPaths.migrations])

    const schema: string = resolveSchema(process.env, globalConfig)

    const ormConfig: Partial<MikroORMOptions<IDatabaseDriver<Connection>, EntityManager<IDatabaseDriver<Connection>>>> = {
      baseDir: process.cwd(),
      migrations: {
        snapshot: false,
        migrationsList: migrationClasses ?? [],
        disableForeignKeys: false
      },
      discovery: {
        warnWhenNoEntities: false,
        requireEntitiesArray: false,
        disableDynamicFileAccess: false
      }
    }

    orm = await initDatabase({
      ...ormConfig,
      ...globalConfig.database
    })

    if (orm != null && !(await orm.isConnected())) {
      throw new Error('Failed to connect to the database. Please ensure your ayazmo.config.js file has the correct DB credentials.')
    }

    const migrator: Migrator = orm.getMigrator()
    await orm.em.getConnection().execute(`SET search_path TO ${schema};`)

    if (options != null) {
      return await migrator.down(options)
    } else {
      return await migrator.down()
    }
  } catch (error) {
    CliLogger.error(error)
    throw error
  } finally {
    if (orm != null) await orm.close(true)
  }
}
