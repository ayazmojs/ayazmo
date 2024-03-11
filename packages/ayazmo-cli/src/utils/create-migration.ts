import path from 'node:path'
import { importGlobalConfig, initDatabase } from '@ayazmo/utils'
import type { IBaseOrmConfig, ITypePrompt, INamePrompt, IPluginPrompt, Migrator, PluginConfig } from '@ayazmo/types'
import { getPluginRoot } from '@ayazmo/core'
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
} from './prompts.js'
import CliLogger from './cli-logger.js'

export async function createMigration(): Promise<void> {
  let orm: any
  let migrationPath: string
  let entitiesPath: string[] = []
  let availablePlugins: string[]
  let selectPluginPrompt: IPluginPrompt = { selectedPlugin: '' }
  let migrationTypePrompt: ITypePrompt = { type: 'entities' }
  let migrationNamePrompt: INamePrompt = { filename: '' }
  const cwd = process.cwd()
  const ormConfig: IBaseOrmConfig = {
    entities: entitiesPath,
    entitiesTs: ['./src/plugins/*/src/entities'],
    baseDir: cwd,
    migrations: {
      snapshot: false,
      path: '',
      emit: 'ts'
    }
  }

  try {
    const globalConfig = await importGlobalConfig()
    migrationTypePrompt = await askUserForTypeOfMigration()

    if (migrationTypePrompt.type === 'empty') {
      ormConfig.discovery = {
        warnWhenNoEntities: false,
        requireEntitiesArray: false,
        disableDynamicFileAccess: false
      }

      migrationNamePrompt = await askUserForMigrationName()
    }

    availablePlugins = globalConfig.plugins.map(plugin => plugin.name)
    const entitiesPaths: string[] = globalConfig.plugins.map(plugin => path.join(getPluginRoot(plugin.name, plugin.settings), 'dist', 'entities'))

    if (availablePlugins.length === 1) {

      migrationPath = path.join(getPluginRoot(globalConfig.plugins[0].name, globalConfig.plugins[0].settings ?? {}), 'src', 'migrations')
      entitiesPath = [...entitiesPath, path.join(getPluginRoot(globalConfig.plugins[0].name, globalConfig.plugins[0].settings ?? {}), 'dist', 'entities')]

    } else if (availablePlugins.length > 1) {

      selectPluginPrompt = await askUserWhichPlugin(availablePlugins)
      if (!globalConfig.plugins.some((plugin) => plugin.name === selectPluginPrompt.selectedPlugin)) {
        throw new Error(`Plugin ${selectPluginPrompt.selectedPlugin} is not enabled in ayazmo.config.js`)
      }

      const pluginConfig: PluginConfig | undefined = globalConfig.plugins.find(p => p.name == selectPluginPrompt.selectedPlugin)

      if (!pluginConfig) {
        throw new Error(`Plugin ${selectPluginPrompt.selectedPlugin} is not enabled in ayazmo.config.js`)
      }

      migrationPath = path.join(getPluginRoot(selectPluginPrompt.selectedPlugin, pluginConfig.settings ?? {}), 'src', 'migrations')
      entitiesPath = [...entitiesPath, ...entitiesPaths]
    } else {

      throw new Error('No plugins available in this project.')

    }

    ormConfig.migrations.path = migrationPath
    ormConfig.entities = entitiesPath

    // @ts-ignore
    orm = await initDatabase({
      ...ormConfig,
      ...globalConfig.database
    })

    if (!(await orm.isConnected())) {
      throw new Error('Failed to connect to the database. Please ensure your ayazmo.config.js file has the correct DB credentials.')
    }

    const migrator: Migrator = orm.getMigrator()
    const pendingMigrations = await migrator.getPendingMigrations()

    if (Array.isArray(pendingMigrations) && pendingMigrations.length > 0) {
      throw new Error('There are pending migrations. Please run them before creating a new one.')
    }

    const { fileName } = await migrator.createMigration(ormConfig.migrations.path, migrationTypePrompt.type === 'empty', false, migrationNamePrompt.filename)
    CliLogger.success(`Successfully created migration: ${fileName}`)
  } catch (error) {
    CliLogger.error(error)
  } finally {
    if (orm) {
      await orm.close(true)
    }
    process.exit(0)
  }
}
