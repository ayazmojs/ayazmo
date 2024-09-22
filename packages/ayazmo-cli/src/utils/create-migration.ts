import path from 'node:path'
import fs from 'node:fs/promises'
import { importGlobalConfig, initDatabase, loadEnvironmentVariables } from '@ayazmo/utils'
import type { IBaseOrmConfig, ITypePrompt, INamePrompt, IPluginPrompt, Migrator, PluginConfig } from '@ayazmo/types'
import { getPluginRoot } from '@ayazmo/core'
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
} from './prompts.js'
import CliLogger from './cli-logger.js'

// Helper function to get entity files from a directory
async function getEntityFiles(directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory)
    return files.filter(file => file.endsWith('.ts') || file.endsWith('.js')).map(file => path.join(directory, file))
  } catch (error) {
    CliLogger.warn(`Failed to read directory ${directory}: ${error.message}`)
    return []
  }
}

// Helper function to dynamically import entity files
async function importEntityFiles(files: string[]): Promise<any[]> {
  const imports: any[] = []
  for (const file of files) {
    try {
      const module = await import(file)
      if (module.default) {
        imports.push(module.default)
      } else {
        imports.push(module)
      }
    } catch (error) {
      CliLogger.warn(`Failed to import file ${file}: ${error.message}`)
    }
  }
  return imports
}

export async function createMigration(): Promise<void> {
  loadEnvironmentVariables()
  let orm: any
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
    if (!globalConfig || !globalConfig.plugins) {
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

    // Populate ormConfig.entities with imported entity files
    for (const dir of entitiesPath) {
      const entityFiles = await getEntityFiles(dir)
      if (entityFiles.length > 0) {
        const importedEntities = await importEntityFiles(entityFiles)
        ormConfig.entities.push(...importedEntities)
      }
    }

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
