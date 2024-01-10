// plugin-manager.ts

import fs from 'node:fs';
import path from 'node:path';
import { asValue } from 'awilix';
import { RequestContext, MigrationObject } from '@mikro-orm/core';
import { EntityClass, EntityClassGroup, EntitySchema } from '@ayazmo/utils';
import { globby } from 'globby';

import { loadRoutes } from '../loaders/routes.js';
import { loadEntities } from '../loaders/entities.js';
import { loadServices } from '../loaders/services.js';
import { loadGraphQL } from '../loaders/graphql.js';
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
  let migrationFiles: string[] = [];
  for (const migrationPath of migrationPaths) {
    const paths = await globby(`${migrationPath}/*.js`);
    migrationFiles = migrationFiles.concat(paths);
  }

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

export const getPluginEntities = (pluginName: string, settings: any): string[] => {
  const pluginPaths: PluginPaths = getPluginPaths(pluginName, settings);
  return listFilesInDirectory(pluginPaths.entities);
}

export const loadPlugins = async (app: any, container: any): Promise<void> => {
  const config: AppConfig = container.resolve('config');
  let entities: any[] = [];

  // Check if there are no plugins in the configuration
  if (!config.plugins || config.plugins.length === 0) {
    app.log.warn('No plugins enabled in ayazmo.config.js file.');
    return;
  }

  // register all plugins
  for (const registeredPlugin of config.plugins) {
    const customPluginPath: string = path.join(pluginsRoot, registeredPlugin.name);
    const nodeModulePluginPath: string = path.join(nodeModulesPath, registeredPlugin.name);

    let pluginPaths: PluginPaths | null = null;

    if (fs.existsSync(customPluginPath)) {
      pluginPaths = constructPaths(registeredPlugin.name, pluginsRoot);
    } else if (fs.existsSync(nodeModulePluginPath)) {
      pluginPaths = constructPaths(registeredPlugin.name, nodeModulesPath);
    } else {
      app.log.error(`Plugin '${registeredPlugin.name}' was not found in plugins directory or node_modules.`);
      continue;
    }

    app.log.info(`Loading plugin '${registeredPlugin.name}'...`)

    // Iterate over your loaders and call each one with the respective path and settings
    entities = await loadEntities(app, pluginPaths.entities);
    await loadServices(app, container, pluginPaths.services);
    await loadRoutes(app, pluginPaths.routes);
    await loadGraphQL(app, pluginPaths.graphql);
  }

  const dbConfig = merge({
    discovery: { disableDynamicFileAccess: true, warnWhenNoEntities: false },
    debug: false,
    tsNode: false,
    driverOptions: {
      connection: { ssl: true }
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
      db: asValue(db),
    })
  } catch (error) {
    app.log.error(`- Error while loading entities: ${error}`);
  }

};

export function listFilesInDirectory(directory: string): string[] {
  // Check if the directory exists
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
