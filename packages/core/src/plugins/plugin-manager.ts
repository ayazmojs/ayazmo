// plugin-manager.ts

import fs from 'node:fs'
import path from 'node:path'
import { asValue } from 'awilix'
import { RequestContext, MigrationObject, AnyEntity, MikroORM, AyazmoInstance, EntityClass, EntityClassGroup, EntitySchema, PluginPaths, AppConfig, PostgreSqlDriver, PluginConfig, PluginSettings } from '@ayazmo/types'
import { merge, PluginCache, PLUGINS_ROOT, getPluginCacheEntityPath } from '@ayazmo/utils'
import { globby } from 'globby'
import { loadRoutes } from '../loaders/routes.js'
import { loadEntities } from '../loaders/entities.js'
import { loadServices } from '../loaders/services.js'
import { loadGraphQL } from '../loaders/graphql.js'
import { loadSubscribers } from '../loaders/subscribers.js'
import { loadAdminRoutes } from '../loaders/admin/routes.js'
import adminAuthChain from '../admin/auth/adminAuthChain.js'
import { BaseSchemaEntity } from '../interfaces/BaseSchemaEntity.js'

/**
 * Constructs the file paths for various components of a plugin based on the plugin name and base directory.
 *
 * This helper function creates an object with paths pointing to the expected locations of a plugin's
 * services, GraphQL definitions, routes, subscribers, and bootstrap files within
 * a specified base directory. The base directory is typically the root of either the 'plugins' directory
 * for private plugins or 'node_modules' for public plugins.
 *
 * @param {string} pluginName - The name of the plugin for which to construct the paths.
 * @param {string} baseDir - The base directory where the plugin is located.
 * @returns {PluginPaths} An object containing the paths to the plugin's components.
 */
export const constructPaths = (pluginName: string, baseDir: string): PluginPaths => {
  const basePath: string = path.join(baseDir, pluginName, 'dist')
  return {
    services: path.join(basePath, 'services'),
    graphql: path.join(basePath, 'graphql'),
    entities: path.join(basePath, 'entities'),
    routes: path.join(basePath, 'routes.js'),
    migrations: path.join(basePath, 'migrations'),
    subscribers: path.join(basePath, 'subscribers'),
    bootstrap: path.join(basePath, 'bootstrap.js'),
    config: path.join(basePath, 'config.template.js'),
    admin: {
      routes: path.join(basePath, 'admin', 'routes.js')
    }
  }
}

/**
 * Retrieves the root directory path for a given plugin.
 *
 * This function determines the root directory of a plugin based on its name and settings.
 * If the plugin is marked as private in its settings, the function will return the path
 * within the local 'plugins' directory. Otherwise, it will return the path within
 * 'node_modules'.
 *
 * @param {string} pluginName - The name of the plugin for which to retrieve the root path.
 * @param {any} settings - An object containing the settings for the plugin, which may include
 *                         a 'private' property indicating whether the plugin is private.
 * @returns {string} The absolute path to the root directory of the plugin.
 */
export const getPluginRoot = (pluginName: string, settings: any): string => {
  const nodeModulesPath: string = path.join(process.cwd(), 'node_modules', pluginName)

  const isPrivatePlugin = settings?.private ?? false
  if (isPrivatePlugin) {
    return path.join(PLUGINS_ROOT, pluginName)
  }

  return nodeModulesPath
}

/**
 * Constructs the file paths for various components of a plugin based on its name and settings.
 *
 * This function generates an object containing paths to the services, GraphQL schema, entities,
 * routes, migrations, subscribers, and bootstrap files of a plugin. If the plugin is marked as
 * private in its settings, the paths will point to the corresponding directories and files within
 * the local 'plugins' directory. Otherwise, the paths will point to locations within the
 * 'node_modules' directory.
 *
 * @param {string} pluginName - The name of the plugin for which to construct the paths.
 * @param {any} settings - An object containing the settings for the plugin, which may include
 *                         a 'private' property indicating whether the plugin is private.
 * @returns {PluginPaths} An object containing the constructed file paths for the plugin components.
 */
export const getPluginPaths = (pluginName: string, settings: any): PluginPaths => {
  const nodeModulesPath: string = path.join(process.cwd(), 'node_modules')
  
  if (settings?.path) {
    return constructPaths(pluginName, settings.path)
  }
  
  if (settings?.private) {
    return constructPaths(pluginName, PLUGINS_ROOT)
  }

  return constructPaths(pluginName, nodeModulesPath)
}

/**
 * Discovers the paths for migrations and entities of all public plugins.
 *
 * This function iterates over the provided array of plugin configurations and filters out
 * the public plugins (those not marked as private). For each public plugin, it retrieves
 * the paths to its migrations and entities directories, if they exist, and adds them to
 * the respective arrays in the returned object.
 *
 * @param {PluginConfig[]} plugins - An array of plugin configurations.
 * @returns {{ migrations: string[], entities: string[] }} An object containing arrays of paths
 *          to the migrations and entities directories of all public plugins.
 */
export const discoverPublicPaths = (plugins: PluginConfig[]): { migrations: string[], entities: string[] } => {
  const paths = {
    migrations: [] as string[],
    entities: [] as string[]
  }
  const publicPlugins = plugins.filter(plugin => plugin.settings?.private !== true)
  for (const plugin of publicPlugins) {
    const pluginPaths: PluginPaths = getPluginPaths(plugin.name, plugin.settings)
    if (fs.existsSync(pluginPaths.migrations)) {
      paths.migrations.push(pluginPaths.migrations)
    }

    if (fs.existsSync(pluginPaths.entities)) {
      paths.entities.push(pluginPaths.entities)
    }
  }

  return paths
}

/**
 * Discovers the migration paths for all private plugins.
 *
 * This function filters through the provided plugin configurations to find those marked as private.
 * It then determines the migration paths for these private plugins by constructing the path based
 * on the plugin name and settings. If the migrations directory exists for a plugin, its path is
 * added to the list of migration paths to be returned.
 *
 * @param {PluginConfig[]} plugins - An array of plugin configurations.
 * @returns {string[]} An array containing the migration paths for all private plugins.
 */
export const discoverPrivateMigrationPaths = async (plugins: PluginConfig[]): Promise<string[]> => {
  const migrationPaths: string[] = []
  const privatePlugins = plugins.filter(plugin => plugin.settings?.private === true)
  for (const plugin of privatePlugins) {
    const pluginPaths: PluginPaths = getPluginPaths(plugin.name, plugin.settings)
    if (!fs.existsSync(pluginPaths.migrations)) {
      continue
    }

    migrationPaths.push(pluginPaths.migrations)
  }

  const applicationMigrationPaths = await globby('dist/plugins/*/src/migrations', {
    cwd: process.cwd(),
    onlyDirectories: true,
    absolute: true
  })
  migrationPaths.push(...applicationMigrationPaths)

  return migrationPaths
}

export async function discoverMigrationFiles (migrationPaths: string[]): Promise<MigrationObject[]> {
  const migrationFiles = await globby(migrationPaths.map(path => `${path}/*.js`))

  return await Promise.all(
    migrationFiles.map(async (filePath) => {
      const migrationModule = await import(path.resolve(filePath))
      const migrationName = path.basename(filePath)

      let MigrationClass = migrationModule.default || migrationModule
      if (MigrationClass && typeof MigrationClass !== 'function') {
        // Look for a named export that is a function (possible class)
        MigrationClass = Object.values(migrationModule).find(value => typeof value === 'function')
      }

      return {
        name: migrationName,
        class: MigrationClass
      }
    })
  )
}

async function bootstrapPlugins(app: AyazmoInstance, plugins: PluginConfig[]) {
  for (const plugin of plugins) {
    try {
      const pluginPaths = getPluginPaths(plugin.name, plugin.settings)
      
      if (pluginPaths.bootstrap && fs.existsSync(pluginPaths.bootstrap)) {
        const pluginModule = await import(pluginPaths.bootstrap)
        
        // Validate using the plugin's schema if it exports one
        if (pluginModule.schema) {
          const result = pluginModule.schema.safeParse(plugin)
          if (!result.success) {
            const errors = result.error.errors.map(err => 
              `${err.path.join('.')}: ${err.message}`
            ).join('\n')
            throw new Error(`Invalid configuration for plugin '${plugin.name}':\n${errors}`)
          }
        }

        await pluginModule.default(app, app.diContainer, plugin)
      }
    } catch (error) {
      app.log.error(error)
      throw error
    }
  }
}

export const loadPlugins = async (app: AyazmoInstance): Promise<void> => {
  const config: AppConfig = app.diContainer.resolve('config')
  
  const entities: AnyEntity[] = [BaseSchemaEntity]

  // Check if there are no plugins in the configuration
  if (!config.plugins || config.plugins.length === 0) {
    app.log.warn('No plugins enabled in ayazmo.config.js file.')
    return
  }

  const pluginCache = new PluginCache(app)
  await pluginCache.cachePlugins(config.plugins)

  await bootstrapPlugins(app, config.plugins)

  app.decorate('adminAuthChain', adminAuthChain(app, config))

  for (const plugin of config.plugins) {
    app.log.info(`Loading plugin '${plugin.name}'...`)
    
    const pluginPaths = getPluginPaths(plugin.name, plugin.settings)
    const settings = plugin.settings || {} as PluginSettings

    const [entityCollection] = await Promise.all([
      loadEntities(app, getPluginCacheEntityPath(plugin.name)),
      loadGraphQL(app, pluginPaths.graphql),
      loadServices(app, pluginPaths.services, settings),
      loadRoutes(app, pluginPaths.routes, settings),
      loadSubscribers(app, pluginPaths.subscribers, settings),
      loadAdminRoutes(app, pluginPaths.admin.routes, settings)
    ])

    entities.push(...entityCollection)
  }

  if (config.database) {
    const dbConfig: any = merge({
      driver: PostgreSqlDriver,
      discovery: { disableDynamicFileAccess: true, warnWhenNoEntities: false },
      debug: false,
      tsNode: false,
      entities: entities as Array<string | EntityClass<Partial<any>> | EntityClassGroup<Partial<any>> | EntitySchema<any, never>>
    }, config.database)

    try {
      const db = await MikroORM.init(dbConfig)
      app.log.info('- Database connection established')

      const isConnected = await db.isConnected()
      if (!isConnected) {
        app.log.error('- Database connection failed')
      }

      // register request context hook
      app.addHook('onRequest', (request, reply, done) => {
        RequestContext.create(db.em, done)
      })

      // shut down the connection when closing the app
      app.addHook('onClose', async () => {
        await db.close()
      })

      // register the db instance in the DI container
      app.diContainer.register({
        dbService: asValue(db)
      })
    } catch (error) {
      if (error instanceof AggregateError) {
        for (const individualError of error.errors) {
          if (individualError.code === 'ECONNREFUSED') {
            app.log.error(`- Database connection refused: ${individualError.message}`)
          } else {
            app.log.error(`- Error while initializing database: ${individualError.message}`)
          }
        }
      } else if (error.code === 'ENOTFOUND') {
        app.log.error(`- Database host not found: ${error.message}. Please check your database host settings.`)
      } else {
        app.log.error(`- Error while loading plugins: ${error}\n${error.stack}`)
      }

      process.exit(1)
    }
  }
}

export async function listFilesInDirectory (directory: string): Promise<string[]> {
  // // Check if the directory exists
  if (!fs.existsSync(directory)) {
    return []
  }

  // Get the directory contents
  const contents = fs.readdirSync(directory).filter(file => path.extname(file).toLowerCase() === '.js')

  // Check if the directory is empty
  if (contents.length === 0) {
    return []
  }

  // Filter out non-file entries and return the filenames
  const files = contents.filter((file) =>
    fs.statSync(path.join(directory, file)).isFile()
  )

  return files
}
