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
  discoverPublicPaths,
  getPluginRoot
} from '@ayazmo/core'
import CliLogger from './cli-logger.js'
import path from 'node:path'
import { getEntityFiles, importEntityFiles } from './migration-helpers.js'

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

    // Get entities paths from all enabled plugins
    const entitiesPaths: string[] = globalConfig.plugins.map(plugin =>
      path.join(getPluginRoot(plugin.name, plugin.settings), 'dist', 'entities')
    )

    const schema: string = process.env.DB_SCHEMA ?? globalConfig.database?.schema ?? 'public'

    const ormConfig: Partial<MikroORMOptions<IDatabaseDriver<Connection>, EntityManager<IDatabaseDriver<Connection>>>> = {
      entities: [],
      entitiesTs: ['./src/plugins/*/src/entities'],
      baseDir: process.cwd(),
      migrations: {
        snapshot: false,
        migrationsList: migrationClasses ?? [],
        disableForeignKeys: false
      }
    }

    // Import entities from all plugin paths
    for (const dir of entitiesPaths) {
      const entityFiles = await getEntityFiles(dir)
      if (entityFiles.length > 0) {
        const importedEntities = await importEntityFiles(entityFiles)
        if (Array.isArray(ormConfig.entities)) {
          ormConfig.entities.push(...importedEntities)
        } else {
          ormConfig.entities = importedEntities
        }
      }
    }

    if (!Array.isArray(ormConfig.entities) || ormConfig.entities.length === 0) {
      throw new Error('No database entities found. Please ensure entity files exist in the correct location.')
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
