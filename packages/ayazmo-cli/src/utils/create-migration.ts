import path from 'node:path'
import { globby } from 'globby'
import { importGlobalConfig, initDatabase, loadEnvironmentVariables } from '@ayazmo/utils'
import type { IPluginPrompt, PluginConfig } from '@ayazmo/types'
import {
  Migrator,
  MikroORM,
  MikroORMOptions,
  IDatabaseDriver,
  Connection,
  EntityManager
} from '@ayazmo/types'
import { getPluginRoot } from '@ayazmo/core'
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
} from './prompts.js'
import CliLogger from './cli-logger.js'
import { getEntityFiles, importEntityFiles, copyEntitiesToTemp } from './migration-helpers.js'
import { createAyazmoFolders, cleanupAyazmoFolder } from './ayazmo-folder.js'

// Extended interface to include migration scope
interface ITypePrompt {
  type: 'entities' | 'empty'
  scope?: 'selected' | 'all'
}

interface INamePrompt {
  filename: string
}

/**
 * Creates a new database migration based on entity changes
 * Supports both selective plugin entity copying and copying from all plugins
 */
export async function createMigration (): Promise<void> {
  loadEnvironmentVariables()
  let orm: MikroORM | null = null
  let migrationPath: string
  const entitiesPath: string[] = []
  let availablePlugins: string[] = []
  let selectPluginPrompt: IPluginPrompt = { selectedPlugin: '' }
  let migrationTypePrompt: ITypePrompt = { type: 'entities' }
  let migrationNamePrompt: INamePrompt = { filename: '' }
  const cwd = process.cwd()

  // Initialize ORM configuration with base settings
  const ormConfig: Partial<MikroORMOptions<IDatabaseDriver<Connection>, EntityManager<IDatabaseDriver<Connection>>>> = {
    entities: [],
    baseDir: cwd,
    migrations: {
      snapshot: false,
      path: '',
      emit: 'ts'
    }
  }

  try {
    // Ensure clean state before starting
    await cleanupAyazmoFolder()

    // Load and validate global configuration
    const globalConfig = await importGlobalConfig()
    if (globalConfig == null || globalConfig.plugins == null) {
      throw new Error('Global configuration or plugins are not defined.')
    }

    // Get user's preference for migration type and scope
    migrationTypePrompt = await askUserForTypeOfMigration()

    // Handle empty migration type
    if (migrationTypePrompt.type === 'empty') {
      ormConfig.discovery = {
        warnWhenNoEntities: false,
        requireEntitiesArray: false,
        disableDynamicFileAccess: false
      }
      migrationNamePrompt = await askUserForMigrationName()
    }

    // Get available plugins from config
    availablePlugins = globalConfig.plugins.map(plugin => plugin.name)

    // Initialize .ayazmo/entities folder for temporary entity storage
    await createAyazmoFolders({ subfolders: ['entities'] })

    // Handle plugin selection and entity copying based on scope
    if (availablePlugins.length === 1 && globalConfig.plugins[0] != null) {
      // Single plugin scenario
      const plugin = globalConfig.plugins[0]
      migrationPath = path.join(getPluginRoot(plugin.name, plugin.settings), 'src', 'migrations')
      const pluginEntitiesDir = path.join(getPluginRoot(plugin.name, plugin.settings), 'dist', 'entities')
      const tempPath = await copyEntitiesToTemp(plugin.name, pluginEntitiesDir)
      entitiesPath.push(tempPath)
    } else if (availablePlugins.length > 1) {
      // Multiple plugins scenario
      selectPluginPrompt = await askUserWhichPlugin(availablePlugins)

      // Validate selected plugin
      if (selectPluginPrompt.selectedPlugin != null && !globalConfig.plugins.some((plugin: PluginConfig) => plugin.name === selectPluginPrompt.selectedPlugin)) {
        throw new Error(`Plugin ${selectPluginPrompt.selectedPlugin} is not enabled in ayazmo.config.js`)
      }

      const pluginConfig: PluginConfig | undefined = globalConfig.plugins.find(p => p.name === selectPluginPrompt.selectedPlugin)
      if (pluginConfig == null) {
        throw new Error(`Plugin ${selectPluginPrompt.selectedPlugin ?? ''} is not enabled in ayazmo.config.js`)
      }

      migrationPath = path.join(getPluginRoot(selectPluginPrompt.selectedPlugin, pluginConfig.settings ?? {}), 'src', 'migrations')

      // Copy entities based on selected scope
      if (migrationTypePrompt.scope === 'selected') {
        // Copy entities only from the selected plugin
        const pluginEntitiesDir = path.join(getPluginRoot(pluginConfig.name, pluginConfig.settings), 'dist', 'entities')
        const tempPath = await copyEntitiesToTemp(pluginConfig.name, pluginEntitiesDir)
        entitiesPath.push(tempPath)
      } else {
        // Copy entities from all plugins
        for (const plugin of globalConfig.plugins) {
          const pluginEntitiesDir = path.join(getPluginRoot(plugin.name, plugin.settings), 'dist', 'entities')
          const tempPath = await copyEntitiesToTemp(plugin.name, pluginEntitiesDir)
          entitiesPath.push(tempPath)
        }
      }
    } else {
      throw new Error('No plugins available in this project.')
    }

    // Set migration path in ORM config
    if (ormConfig.migrations != null) {
      ormConfig.migrations.path = migrationPath
    }

    // Add entities from application if scope is 'all' or not specified
    if (migrationTypePrompt.scope !== 'selected') {
      const applicationEntityPaths = await globby('dist/plugins/*/src/entities', {
        cwd,
        onlyDirectories: true,
        absolute: true
      })
      entitiesPath.push(...applicationEntityPaths)
    }

    // Import and configure entity files
    for (const dir of entitiesPath) {
      const entityFiles = await getEntityFiles(dir)
      if (entityFiles.length > 0) {
        const importedEntities = await importEntityFiles(entityFiles)
        if (ormConfig.entities != null) {
          ormConfig.entities.push(...importedEntities)
        }
      }
    }

    // Initialize database connection
    orm = await initDatabase({
      ...ormConfig,
      ...globalConfig.database
    })

    if (orm != null && !(await orm.isConnected())) {
      throw new Error('Failed to connect to the database. Please ensure your ayazmo.config.js file has the correct DB credentials.')
    }

    // Check for pending migrations
    const migrator: Migrator = orm.getMigrator()
    const pendingMigrations = await migrator.getPendingMigrations()

    if (Array.isArray(pendingMigrations) && pendingMigrations.length > 0) {
      throw new Error('There are pending migrations. Please run them before creating a new one.')
    }

    // Create the migration
    const { fileName } = await migrator.createMigration(
      ormConfig.migrations?.path ?? '',
      migrationTypePrompt.type === 'empty',
      false,
      migrationNamePrompt.filename
    )

    // Log the result
    if (fileName != null && fileName.trim() !== '') {
      CliLogger.success(`Successfully created migration: ${ormConfig.migrations?.path ?? ''}/${fileName}`)
    } else {
      CliLogger.error(`No Entities found to create migration. Scanned plugins: ${availablePlugins.join(', ')}`)
    }
  } catch (error) {
    CliLogger.error((error as Error).message)
  } finally {
    // Cleanup and close connections
    if (orm != null) {
      await orm.close(true)
    }
    await cleanupAyazmoFolder()
    process.exit(0)
  }
}
