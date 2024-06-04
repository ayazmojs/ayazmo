// plugin-manager.ts

import fs from 'node:fs'
import path from 'node:path'
import { asValue } from 'awilix'
import { RequestContext, MigrationObject, AnyEntity, MikroORM } from '@mikro-orm/core'
import { merge } from '@ayazmo/utils'
import { EntityClass, EntityClassGroup, EntitySchema, PluginPaths, AppConfig, PostgreSqlDriver, PluginConfig, AyazmoContainer } from '@ayazmo/types'
import { globby } from 'globby'
import { FastifyInstance } from 'fastify'

import { loadRoutes } from '../loaders/routes.js'
import { loadEntities } from '../loaders/entities.js'
import { loadServices } from '../loaders/services.js'
import { loadGraphQL } from '../loaders/graphql.js'
import { loadSubscribers } from '../loaders/subscribers.js'

const pluginsRoot: string = path.join(process.cwd(), 'src', 'plugins')
const nodeModulesPath: string = path.join(process.cwd(), 'node_modules')

/**
 * Constructs the file paths for various components of a plugin based on the plugin name and base directory.
 *
 * This helper function creates an object with paths pointing to the expected locations of a plugin's
 * services, GraphQL definitions, entities, routes, migrations, subscribers, and bootstrap files within
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
    bootstrap: path.join(basePath, 'bootstrap.js')
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

  if (settings?.private) {
    return path.join(pluginsRoot, pluginName)
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
  // check if the plugin settings private is true and load the plugin paths from src
  if (settings?.private) {
    return constructPaths(pluginName, pluginsRoot)
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
  };
  const publicPlugins = plugins.filter(plugin => plugin.settings?.private !== true)
  for (const plugin of publicPlugins) {
    const pluginPaths: PluginPaths = getPluginPaths(plugin.name, plugin.settings)
    if (fs.existsSync(pluginPaths.migrations)) {
      paths.migrations.push(pluginPaths.migrations);
    }
    
    if (fs.existsSync(pluginPaths.entities)) {
      paths.entities.push(pluginPaths.entities);
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
export const discoverPrivateMigrationPaths = (plugins: PluginConfig[]): string[] => {
  const migrationPaths: string[] = []
  const privatePlugins = plugins.filter(plugin => plugin.settings?.private === true)
  for (const plugin of privatePlugins) {
    const pluginPaths: PluginPaths = getPluginPaths(plugin.name, plugin.settings)
    if (!fs.existsSync(pluginPaths.migrations)) {
      continue
    }

    migrationPaths.push(pluginPaths.migrations)
  }

  return migrationPaths
}

export async function discoverMigrationFiles(migrationPaths: string[]): Promise<MigrationObject[]> {
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

export const loadPlugins = async (app: FastifyInstance, container: AyazmoContainer): Promise<void> => {
  const config: AppConfig = container.resolve('config')
  const entities: AnyEntity[] = []

  // Check if there are no plugins in the configuration
  if (!config.plugins || config.plugins.length === 0) {
    app.log.warn('No plugins enabled in ayazmo.config.js file.')
    return
  }

  for (const registeredPlugin of config.plugins) {
    const privatePluginPath: string = path.join(pluginsRoot, registeredPlugin.name)
    const publicPluginPath: string = path.join(nodeModulesPath, registeredPlugin.name)

    let pluginPaths: PluginPaths | null = null

    if (fs.existsSync(privatePluginPath)) {
      pluginPaths = constructPaths(registeredPlugin.name, pluginsRoot)
    } else if (fs.existsSync(publicPluginPath)) {
      pluginPaths = constructPaths(registeredPlugin.name, nodeModulesPath)
    } else {
      app.log.error(`Plugin '${registeredPlugin.name}' was not found in plugins directory or node_modules.`)
    }

    app.log.info(`Loading plugin '${registeredPlugin.name}'...`)

    if (pluginPaths != null) {
      // @ts-expect-error
      const [entityCollection, gqlCollection, ...rest] = await Promise.all([
        loadEntities(app, pluginPaths.entities),
        loadGraphQL(app, pluginPaths.graphql),
        loadServices(app, container, pluginPaths.services, registeredPlugin.settings),
        loadRoutes(app, container, pluginPaths.routes, registeredPlugin.settings),
        loadSubscribers(app, container, pluginPaths.subscribers, registeredPlugin.settings)
      ])

      entities.push(...entityCollection)

      if (pluginPaths.bootstrap && fs.existsSync(pluginPaths.bootstrap)) {
        const bootstrap = await import(pluginPaths.bootstrap)

        if (!bootstrap.default || typeof bootstrap.default !== 'function') {
          throw new Error(`The module ${pluginPaths.bootstrap} does not have a valid default export.`)
        }
        await bootstrap.default(app, container, registeredPlugin)
      }
    }
  }

  const { type, ...rest } = config.database

  if (type === 'postgresql') {
    rest.driver = PostgreSqlDriver
  }

  const dbConfig: any = merge({
    discovery: { disableDynamicFileAccess: true, warnWhenNoEntities: false },
    debug: false,
    tsNode: false,
    entities: entities as Array<string | EntityClass<Partial<any>> | EntityClassGroup<Partial<any>> | EntitySchema<any, never>>
  }, rest)

  try {
    // Initialize the database connection
    const db = await MikroORM.init(dbConfig)
    app.log.info('- Database connection established')

    // check connection
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
    container.register({
      dbService: asValue(db)
    })
  } catch (error) {
    if (error instanceof AggregateError) {
      for (const individualError of error.errors) {
        if (individualError.code === 'ECONNREFUSED') {
          app.log.error(`- Database connection refused: ${individualError.message}`);
        } else {
          app.log.error(`- Error while initializing database: ${individualError.message}`);
        }
      }
    } else if (error.code === 'ENOTFOUND') {
      app.log.error(`- Database host not found: ${error.message}. Please check your database host settings.`);
    } else {
      app.log.error(`- Error while loading plugins: ${error}\n${error.stack}`);
    }

    process.exit(1)
  }
}

export async function listFilesInDirectory(directory: string): Promise<string[]> {
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
