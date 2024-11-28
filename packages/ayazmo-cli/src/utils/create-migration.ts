import path from 'node:path'
import { importGlobalConfig, initDatabase, loadEnvironmentVariables } from '@ayazmo/utils'
import type { IBaseOrmConfig, ITypePrompt, INamePrompt, IPluginPrompt, Migrator, PluginConfig, MikroORM } from '@ayazmo/types'
import { getPluginRoot } from '@ayazmo/core'
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
} from './prompts.js'
import CliLogger from './cli-logger.js'
import { getEntityFiles, importEntityFiles } from './migration-helpers.js'

export async function createMigration (): Promise<void> {
  loadEnvironmentVariables()
  let orm: MikroORM | null = null
  let migrationPath: string
  let entitiesPath: string[] = []
  let availablePlugins: string[] = []
  let selectPluginPrompt: IPluginPrompt = { selectedPlugin: '' }
  let migrationTypePrompt: ITypePrompt = { type: 'entities' }
  let migrationNamePrompt: INamePrompt = { filename: '' }
  const cwd = process.cwd()
  const ormConfig: IBaseOrmConfig = {
    entities: [],
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
    if (globalConfig == null || globalConfig.plugins == null) {
      throw new Error('Global configuration or plugins are not defined.')
    }

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

    if (availablePlugins.length === 1 && globalConfig.plugins[0] != null) {
      migrationPath = path.join(getPluginRoot(globalConfig.plugins[0].name, globalConfig.plugins[0].settings ?? {}), 'src', 'migrations')
      entitiesPath = [...entitiesPath, path.join(getPluginRoot(globalConfig.plugins[0].name, globalConfig.plugins[0].settings ?? {}), 'dist', 'entities')]
    } else if (availablePlugins.length > 1) {
      selectPluginPrompt = await askUserWhichPlugin(availablePlugins)
      if (selectPluginPrompt.selectedPlugin != null && !globalConfig.plugins.some((plugin: PluginConfig) => plugin.name === selectPluginPrompt.selectedPlugin)) {
        throw new Error(`Plugin ${selectPluginPrompt.selectedPlugin} is not enabled in ayazmo.config.js`)
      }

      const pluginConfig: PluginConfig | undefined = globalConfig.plugins.find(p => p.name === selectPluginPrompt.selectedPlugin)

      if (pluginConfig == null) {
        throw new Error(`Plugin ${selectPluginPrompt.selectedPlugin ?? ''} is not enabled in ayazmo.config.js`)
      }

      migrationPath = path.join(getPluginRoot(selectPluginPrompt.selectedPlugin, pluginConfig.settings ?? {}), 'src', 'migrations')
      entitiesPath = [...entitiesPath, ...entitiesPaths]
    } else {
      throw new Error('No plugins available in this project.')
    }

    ormConfig.migrations.path = migrationPath

    // Populate ormConfig.entities with imported entity files
    for (const dir of entitiesPath) {
      const entityFiles = await getEntityFiles(dir)
      if (entityFiles.length > 0) {
        const importedEntities = await importEntityFiles(entityFiles)
        ormConfig.entities.push(...importedEntities)
      }
    }

    // @ts-expect-error
    orm = await initDatabase({
      ...ormConfig,
      ...globalConfig.database
    })

    if (orm != null && !(await orm.isConnected())) {
      throw new Error('Failed to connect to the database. Please ensure your ayazmo.config.js file has the correct DB credentials.')
    }

    const migrator: Migrator = orm.getMigrator()
    const pendingMigrations = await migrator.getPendingMigrations()

    if (Array.isArray(pendingMigrations) && pendingMigrations.length > 0) {
      throw new Error('There are pending migrations. Please run them before creating a new one.')
    }

    const { fileName } = await migrator.createMigration(ormConfig.migrations.path, migrationTypePrompt.type === 'empty', false, migrationNamePrompt.filename)

    if (fileName != null && fileName.trim() !== '') {
      CliLogger.success(`Successfully created migration: ${fileName}`)
    } else {
      CliLogger.error(`No Entities found to create migration. Scanned plugins: ${availablePlugins.join(', ')}`)
    }
  } catch (error) {
    CliLogger.error((error as Error).message)
  } finally {
    if (orm != null) {
      await orm.close(true)
    }
    process.exit(0)
  }
}
