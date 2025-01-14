import {
  initDatabase,
  importGlobalConfig
} from '@ayazmo/utils'
import { Migrator, MigrationObject, MikroORM } from '@ayazmo/types'
import {
  discoverPrivateMigrationPaths,
  discoverMigrationFiles,
  discoverPublicPaths
} from '@ayazmo/core'
import CliLogger from './cli-logger.js'
import { askUserForMigrationPlugin } from './prompts.js'

interface MigrationOptions {
  interactive?: boolean
  plugin?: string
}

export async function runMigrations (options: MigrationOptions = { interactive: false }): Promise<void> {
  let orm: MikroORM | null = null
  CliLogger.info('Checking environment...')

  try {
    const globalConfig = await importGlobalConfig()

    if (!Array.isArray(globalConfig.plugins) || globalConfig.plugins.length === 0) {
      throw new Error('No plugins enabled!')
    }

    // Early validation of plugin parameter
    if (options.plugin) {
      const pluginExists = globalConfig.plugins.some(p => p.name === options.plugin)
      if (!pluginExists) {
        throw new Error(`Plugin "${options.plugin}" is not enabled in your configuration. Please check your config file.`)
      }
    }

    let selectedPlugin: { type: 'all' | 'single', value: string }

    if (options.plugin) {
      selectedPlugin = { type: 'single', value: options.plugin }
    } else if (options.interactive) {
      const choice = await askUserForMigrationPlugin(globalConfig.plugins)
      selectedPlugin = {
        type: choice.type === 'specific' ? 'single' : 'all',
        value: choice.value
      }
    } else {
      selectedPlugin = { type: 'all', value: 'all' }
    }

    let migrationsList: MigrationObject[] = []
    if (selectedPlugin.type === 'all') {
      const privateMigrationPaths = await discoverPrivateMigrationPaths(globalConfig.plugins)
      const publicPaths = discoverPublicPaths(globalConfig.plugins)
      migrationsList = await discoverMigrationFiles([...privateMigrationPaths, ...publicPaths.migrations])
    } else {
      const selectedPluginConfig = globalConfig.plugins.find(p => p.name === selectedPlugin.value)
      if (selectedPluginConfig === undefined) {
        throw new Error(`Plugin ${selectedPlugin.value} not found in configuration`)
      }
      const plugins = [selectedPluginConfig]
      const paths = selectedPluginConfig.settings?.private === true
        ? await discoverPrivateMigrationPaths(plugins)
        : discoverPublicPaths(plugins).migrations
      migrationsList = await discoverMigrationFiles(paths)
    }

    if (migrationsList.length === 0) {
      throw new Error('No migrations found. Did you build your application?')
    }

    const schema: string = process.env.DB_SCHEMA ?? globalConfig.database?.schema ?? 'public'

    orm = await initDatabase({
      ...{
        baseDir: process.cwd(),
        migrations: {
          snapshot: false,
          migrationsList,
          disableForeignKeys: false,
          allOrNothing: true
        },
        discovery: {
          warnWhenNoEntities: false,
          requireEntitiesArray: false,
          disableDynamicFileAccess: false
        }
      },
      ...globalConfig.database
    })

    const migrator: Migrator = orm.getMigrator()

    await orm.em.getConnection().execute(`CREATE SCHEMA IF NOT EXISTS ${schema};`)
    await orm.em.getConnection().execute(`SET search_path TO ${schema};`)

    const pendingMigrations = await migrator.getPendingMigrations()

    if (!Array.isArray(pendingMigrations) || pendingMigrations.length === 0) {
      CliLogger.info('There are no pending migrations. Please create a migration first or build the existing ones.')
    } else {
      await migrator.up()
      const appliedMigrations = migrationsList.map(m => m.name).join('\n- ')
      const pluginInfo = selectedPlugin.type === 'all' ? 'all plugins' : `plugin: ${selectedPlugin.value}`
      CliLogger.success(`Migrations applied successfully for ${pluginInfo}!\nApplied migrations:\n- ${appliedMigrations}`)
    }
  } catch (error) {
    CliLogger.error(error)
  } finally {
    if (orm != null) await orm.close()
    process.exit(0)
  }
}
