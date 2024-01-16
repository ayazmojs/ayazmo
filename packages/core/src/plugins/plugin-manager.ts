// plugin-manager.ts

import fs from 'node:fs';
import path from 'node:path';
import { asValue, AwilixContainer } from 'awilix';
import { RequestContext, MigrationObject, AnyEntity } from '@mikro-orm/core';
import { EntityClass, EntityClassGroup, EntitySchema } from '@ayazmo/utils';
import { globby } from 'globby';

import { loadRoutes } from '../loaders/routes.js';
import { loadEntities } from '../loaders/entities.js';
import { loadServices } from '../loaders/services.js';
import { loadGraphQL } from '../loaders/graphql.js';
import { loadSubscribers } from '../loaders/subscribers.js';
import { AppConfig, initDatabase, merge } from '@ayazmo/utils'
import { PluginPaths } from '@ayazmo/types'

const pluginsRoot: string = path.join(process.cwd(), 'dist', 'plugins');
const nodeModulesPath: string = path.join(process.cwd(), 'node_modules');

// Helper function to construct paths
const constructPaths = (pluginName: string, baseDir: string): PluginPaths => {
  const basePath: string = path.join(baseDir, pluginName, 'src');
  return {
    services: path.join(basePath, 'services'),
    graphql: path.join(basePath, 'graphql'),
    entities: path.join(basePath, 'entities'),
    routes: path.join(basePath, 'routes.js'),
    migrations: path.join(basePath, 'migrations'),
    subscribers: path.join(basePath, 'subscribers'),
  };
};

export const getPluginPaths = (pluginName: string, settings: any): PluginPaths => {
  const nodeModulesPath: string = path.join(process.cwd(), 'node_modules', 'dist');
  // check if the plugin settings private is true and load the plugin paths from src
  if (settings?.private) {
    return constructPaths(pluginName, pluginsRoot);
  }

  return constructPaths(pluginName, nodeModulesPath);
}

export const discoverPublicMigrationPaths = (plugins: any[]): string[] => {
  let migrationPaths: string[] = [];
  const publicPlugins = plugins.filter(plugin => plugin.settings?.private !== true);
  for (const plugin of publicPlugins) {
    const pluginPaths: PluginPaths = getPluginPaths(plugin.name, plugin.settings);
    if (!fs.existsSync(pluginPaths.migrations)) {
      continue;
    }

    migrationPaths.push(pluginPaths.migrations);
  }

  return migrationPaths;
}

/**
 * Discover private migration paths
 * 
 * @param plugins plugin definitions from config
 * @returns array of paths to private plugins
 */
export const discoverPrivateMigrationPaths = (plugins: any[]): string[] => {
  let migrationPaths: string[] = [];
  const privatePlugins = plugins.filter(plugin => plugin.settings?.private === true);
  for (const plugin of privatePlugins) {
    const pluginPaths: PluginPaths = getPluginPaths(plugin.name, plugin.settings);
    if (!fs.existsSync(pluginPaths.migrations)) {
      continue;
    }

    migrationPaths.push(pluginPaths.migrations);
  }

  return migrationPaths;
}

export async function discoverMigrationFiles(migrationPaths: string[]): Promise<MigrationObject[]> {
  const migrationFiles = await globby(migrationPaths.map(path => `${path}/*.js`));

  return Promise.all(
    migrationFiles.map(async (filePath) => {
      const migrationModule = await import(path.resolve(filePath));
      const migrationName = path.basename(filePath);

      let MigrationClass = migrationModule.default || migrationModule;
      if (MigrationClass && typeof MigrationClass !== 'function') {
        // Look for a named export that is a function (possible class)
        MigrationClass = Object.values(migrationModule).find(value => typeof value === 'function');
      }

      return {
        name: migrationName,
        class: MigrationClass,
      };
    })
  );
}

export const loadPlugins = async (app: any, container: AwilixContainer): Promise<void> => {
  const config: AppConfig = container.resolve('config');
  let entities: AnyEntity[] = [];

  // Check if there are no plugins in the configuration
  if (!config.plugins || config.plugins.length === 0) {
    app.log.warn('No plugins enabled in ayazmo.config.js file.');
    return;
  }

  // register all plugins
  // Create an array to hold all promises
  let pluginPromises = config.plugins.map(registeredPlugin => {
    const customPluginPath: string = path.join(pluginsRoot, registeredPlugin.name);
    const nodeModulePluginPath: string = path.join(nodeModulesPath, registeredPlugin.name);

    let pluginPaths: PluginPaths | null = null;

    if (fs.existsSync(customPluginPath)) {
      pluginPaths = constructPaths(registeredPlugin.name, pluginsRoot);
    } else if (fs.existsSync(nodeModulePluginPath)) {
      pluginPaths = constructPaths(registeredPlugin.name, nodeModulesPath);
    } else {
      app.log.error(`Plugin '${registeredPlugin.name}' was not found in plugins directory or node_modules.`);
      return Promise.resolve([]); // Resolve with empty array if plugin not found
    }

    app.log.info(`Loading plugin '${registeredPlugin.name}'...`)

    if (pluginPaths) {
      return Promise.all([
        loadEntities(app, pluginPaths.entities),
        loadServices(app, container, pluginPaths.services, registeredPlugin.settings),
        loadRoutes(app, pluginPaths.routes),
        loadGraphQL(app, pluginPaths.graphql),
        loadSubscribers(app, container, pluginPaths.subscribers, registeredPlugin.settings)
      ]).then(results => {
        return results[0] as AnyEntity[];
      });
    } else {
      return Promise.resolve([]); // Resolve with empty array if pluginPaths is null
    }
  });

  // Use Promise.all to wait for all plugins to load
  let results = await Promise.all(pluginPromises);

  // Filter out null results and flatten the array
  entities.push(...results.flat());

  const dbConfig = merge({
    discovery: { disableDynamicFileAccess: true, warnWhenNoEntities: false },
    debug: false,
    tsNode: false,
    driverOptions: {
      connection: { ssl: process.env.NODE_ENV !== 'development' }
    },
    entities: entities as (string | EntityClass<Partial<any>> | EntityClassGroup<Partial<any>> | EntitySchema<any, never>)[],
  }, config.database)

  try {
    // Initialize the database connection
    const db = await initDatabase(dbConfig);

    // check connection
    const isConnected = await db.isConnected();
    if (!isConnected) {
      app.log.error('- Database connection failed');
    }

    // register request context hook
    app.addHook('onRequest', (request, reply, done) => {
      RequestContext.create(db.em, done);
    });

    // shut down the connection when closing the app
    app.addHook('onClose', async () => {
      await db.close()
    });

    // register the db instance in the DI container
    container.register({
      'dbService': asValue(db),
    })
  } catch (error) {
    app.log.error(`- Error while loading entities: ${error}`);
  }

};

export async function listFilesInDirectory(directory: string): Promise<string[]> {
  // // Check if the directory exists
  if (!fs.existsSync(directory)) {
    return [];
  }

  // Get the directory contents
  const contents = fs.readdirSync(directory).filter(file => path.extname(file).toLowerCase() === '.js');

  // Check if the directory is empty
  if (contents.length === 0) {
    return [];
  }

  // Filter out non-file entries and return the filenames
  const files = contents.filter((file) =>
    fs.statSync(path.join(directory, file)).isFile()
  );

  return files;
}
