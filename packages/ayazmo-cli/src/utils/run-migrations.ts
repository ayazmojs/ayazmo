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
import { validatePlugin, determineSelectedPlugin, mergeDbConfig, resolveSchema, createMigrationResult } from './migration-utils.js'
import type { AyazmoMigrationOptions, AyazmoMigrationResult } from '@ayazmo/types'

export async function runMigrations (options: AyazmoMigrationOptions = { interactive: false }): Promise<AyazmoMigrationResult> {
  let orm: MikroORM | null = null
  CliLogger.info('Checking environment...')

  try {
    const globalConfig = await importGlobalConfig()
    
    // Validate plugins
    validatePlugin(options.plugin, globalConfig.plugins)
    
    // Determine plugin selection
    const pluginChoice = options.interactive 
      ? await askUserForMigrationPlugin(globalConfig.plugins)
      : undefined
    const selectedPlugin = determineSelectedPlugin(options, pluginChoice)
    
    // Get migrations list
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
      return createMigrationResult(true, [])
    }

    const schema = resolveSchema(process.env, globalConfig)
    const dbConfig = mergeDbConfig(globalConfig, options.dbCredentials)

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
      ...dbConfig
    })

    const migrator: Migrator = orm.getMigrator()

    // Schema handling for supported databases
    const connection = orm.em.getConnection()
    const isPostgres = connection.constructor.name === 'PostgreSqlConnection'
    
    if (isPostgres) {
      // Attempt to create schema with permission error handling
      try {
        await connection.execute(`CREATE SCHEMA IF NOT EXISTS ${schema};`)
        CliLogger.info(`Schema '${schema}' created or already exists`)
      } catch (error) {
        if (error instanceof Error && 
            ('code' in error && (error.code === '42501' || error.code === '7B') || 
             error.message.toLowerCase().includes('permission') || 
             error.message.toLowerCase().includes('privilege'))) {
          CliLogger.warn(`No permission to create schema '${schema}'. Proceeding with migrations assuming schema exists...`)
        } else {
          CliLogger.error(`Failed to create schema: ${error instanceof Error ? error.message : String(error)}`)
          throw error
        }
      }

      // Set the search path - this is critical and must succeed for PostgreSQL
      try {
        await connection.execute(`SET search_path TO ${schema};`)
      } catch (error) {
        CliLogger.error(`Failed to set search path to schema '${schema}'`)
        throw error
      }
    } else if (schema !== 'public') {
      // For non-PostgreSQL databases, warn if a non-default schema is specified
      CliLogger.warn(`Schema '${schema}' was specified but the current database type doesn't support schemas or uses a different mechanism. This setting will be ignored.`)
    }

    const pendingMigrations = await migrator.getPendingMigrations()

    if (!Array.isArray(pendingMigrations) || pendingMigrations.length === 0) {
      return createMigrationResult(true, [])
    }

    await migrator.up()
    const appliedMigrations = migrationsList.map(m => m.name)
    const pluginInfo = selectedPlugin.type === 'all' ? 'all plugins' : `plugin: ${selectedPlugin.value}`
    CliLogger.success(`Migrations applied successfully for ${pluginInfo}!\nApplied migrations:\n- ${appliedMigrations.join('\n- ')}`)

    return createMigrationResult(true, appliedMigrations)

  } catch (error) {
    CliLogger.error(error)
    return createMigrationResult(false, undefined, error instanceof Error ? error : new Error(String(error)))
  } finally {
    if (orm != null) await orm.close()
  }
}