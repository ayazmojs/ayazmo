import {
  initDatabase,
  importGlobalConfig,
  ENTITIES_TS_PATH,
  ENTITIES_JS_PATH
} from '@ayazmo/utils'
import { Migrator, MigrationObject } from '@ayazmo/types'
import {
  discoverPrivateMigrationPaths,
  discoverMigrationFiles,
  discoverPublicPaths
} from '@ayazmo/core'
import CliLogger from './cli-logger.js'

export async function runMigrations(): Promise<void> {
  let orm: any
  CliLogger.info('Checking environment...')

  try {
    const globalConfig = await importGlobalConfig()

    if (!globalConfig.plugins.length) {
      throw new Error('No plugins enabled!')
    }

    const privateMigrationPaths: string[] = discoverPrivateMigrationPaths(globalConfig.plugins)
    const publicPaths = discoverPublicPaths(globalConfig.plugins)
    const privateMigrationClasses: MigrationObject[] = await discoverMigrationFiles([...privateMigrationPaths, ...publicPaths.migrations])

    if (privateMigrationClasses.length === 0) {
      throw new Error('No migrations found. Did you build your application?')
    }

    const entities = [ENTITIES_JS_PATH]

    if (publicPaths.entities.length) {
      entities.push(...publicPaths.entities.map(entityPath => `${entityPath}/*.js`));
    }

    if (!entities.length) {
      throw new Error("No database entities found.")
    }

    orm = await initDatabase({
      ...{
        entities: entities,
        entitiesTs: [ENTITIES_TS_PATH],
        baseDir: process.cwd(),
        migrations: {
          snapshot: false,
          migrationsList: privateMigrationClasses,
          disableForeignKeys: false
        }
      },
      ...globalConfig.database
    })

    const migrator: Migrator = orm.getMigrator()
    const pendingMigrations = await migrator.getPendingMigrations()

    if (!Array.isArray(pendingMigrations) || pendingMigrations.length === 0) {
      CliLogger.info('There are no pending migrations. Please create a migration first or build the existing ones.')
    } else {
      await migrator.up()
      CliLogger.success('Migrations applied successfully!')
    }
  } catch (error) {
    CliLogger.error(error)
  } finally {
    if (orm) await orm.close()
    process.exit(0)
  }
}
