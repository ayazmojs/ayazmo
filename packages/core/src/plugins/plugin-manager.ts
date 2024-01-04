// plugin-manager.ts

import fs from 'node:fs';
import path from 'node:path';

import { loadRoutes } from '../loaders/routes.js';
import { loadEntities } from '../loaders/entities.js';
import { loadServices } from '../loaders/services.js';
import { loadGraphQL } from '../loaders/graphql.js';
import { AppConfig } from '../interfaces';

const pluginsRoot: string = path.join(process.cwd(), 'dist', 'plugins');
const nodeModulesPath: string = path.join(process.cwd(), 'node_modules');

interface PluginPaths {
  services: string;
  graphql: string;
  entities: string;
  routes: string;
}

// Helper function to construct paths
const constructPaths = (pluginName: string, baseDir: string): PluginPaths => {
  const basePath: string = path.join(baseDir, pluginName, 'src');
  return {
    services: path.join(basePath, 'services'),
    graphql: path.join(basePath, 'graphql'),
    entities: path.join(basePath, 'entities'),
    routes: path.join(basePath, 'routes.js'),
  };
};

// Optional: Function to list all plugins
export const listPlugins = (): string[] => {
  return fs.readdirSync(pluginsRoot).filter((file) => fs.statSync(path.join(pluginsRoot, file)).isDirectory());
};

export const loadPlugins = async (app: any, container: any): Promise<void> => {
  const config: AppConfig = container.resolve('config');

  // Check if there are no plugins in the configuration
  if (!config.plugins || config.plugins.length === 0) {
    app.log.warn('No plugins enabled in ayazmo.config.js file.');
    return;
  }

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
    await loadEntities(app, container, pluginPaths.entities);
    await loadServices(app, container, pluginPaths.services);
    await loadRoutes(app, pluginPaths.routes);
    await loadGraphQL(app, pluginPaths.graphql);
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
