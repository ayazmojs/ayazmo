// core/src/utils/plugin-cache.ts
import { AyazmoInstance, PluginConfig } from '@ayazmo/types'
import { createAyazmoFolders } from './ayazmo-folder.js'
import { glob } from 'glob'
import path from 'node:path'
import fs from 'node:fs'
import { getPluginCacheEntityPath, resolvePluginPaths, AYAZMO_CACHE_ROOT } from './paths.js'

export interface IPluginPaths {
  pluginName: string;
  entityPath: string;
  isPrivate: boolean;
}

export class PluginCache {
  private readonly app: AyazmoInstance
  private readonly cacheRoot: string

  constructor(app: AyazmoInstance) {
    this.app = app
    this.cacheRoot = AYAZMO_CACHE_ROOT
    this.app.log.debug(`Plugin cache root initialized at: ${this.cacheRoot}`)
  }

  /**
   * Initialize the plugin cache structure
   */
  private async initializeCache(): Promise<void> {
    await createAyazmoFolders({
      root: this.cacheRoot,
      subfolders: []
    })
    this.app.log.debug(`Initialized plugin cache structure at ${this.cacheRoot}`)

    if (!fs.existsSync(this.cacheRoot)) {
      throw new Error(`Failed to create plugin cache directory at ${this.cacheRoot}`)
    }
  }

  /**
   * Discover paths for all plugins (both public and private)
   */
  private async discoverPluginPaths(plugins: PluginConfig[]): Promise<IPluginPaths[]> {
    const pluginPaths: IPluginPaths[] = [];

    for (const plugin of plugins) {
      const { entityPath } = resolvePluginPaths(plugin.name, plugin.settings);

      if (await fs.promises.access(entityPath).then(() => true).catch(() => false)) {
        pluginPaths.push({
          pluginName: plugin.name,
          entityPath,
          isPrivate: plugin.settings?.private === true
        });
      }
    }

    return pluginPaths;
  }

  /**
   * Copy a directory recursively
   */
  private async copyDirRecursive(source: string, target: string): Promise<void> {
    await fs.promises.mkdir(target, { recursive: true });
    const files = await fs.promises.readdir(source);

    for (const file of files) {
      if (file.endsWith('.d.ts')) continue;

      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      const stat = await fs.promises.stat(sourcePath);

      if (stat.isDirectory()) {
        this.app.log.debug(`Copying directory ${sourcePath} to ${targetPath}`);
        await this.copyDirRecursive(sourcePath, targetPath);
      } else {
        this.app.log.debug(`Copying file ${sourcePath} to ${targetPath}`);
        await fs.promises.copyFile(sourcePath, targetPath);
      }
    }
  }

  /**
   * Cache a single plugin's entities
   */
  private async cachePlugin(pluginPath: IPluginPaths): Promise<void> {
    const cacheEntitiesPath = getPluginCacheEntityPath(pluginPath.pluginName);

    try {
      this.app.log.debug(`Attempting to cache plugin ${pluginPath.pluginName} entities`);
      this.app.log.debug(`Source entities path: ${pluginPath.entityPath}`);
      this.app.log.debug(`Cache entities path: ${cacheEntitiesPath}`);

      await this.copyDirRecursive(pluginPath.entityPath, cacheEntitiesPath);

      if (!await fs.promises.access(cacheEntitiesPath).then(() => true).catch(() => false)) {
        throw new Error(`Cache entities path ${cacheEntitiesPath} was not created after copy operation`);
      }

      this.app.log.debug(`Successfully cached plugin ${pluginPath.pluginName} entities`);
    } catch (error) {
      this.app.log.error(`Failed to cache plugin ${pluginPath.pluginName} entities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cache all plugins (both public and private)
   */
  public async cachePlugins(plugins: PluginConfig[]): Promise<void> {
    await this.initializeCache();
    
    const pluginPaths = await this.discoverPluginPaths(plugins);
    this.app.log.debug(`Found ${pluginPaths.length} plugins to cache`);
    
    await Promise.all(pluginPaths.map(plugin => this.cachePlugin(plugin)));
  }

  /**
   * Get all cached plugin entity paths
   */
  public async getCachedPaths(): Promise<Map<string, string>> {
    const paths = new Map<string, string>();
    const pluginDirs = await glob('*/src/entities', { 
      cwd: this.cacheRoot,
      absolute: true
    });

    for (const dir of pluginDirs) {
      const pluginName = path.basename(path.dirname(path.dirname(dir)));
      paths.set(pluginName, dir);
    }

    return paths;
  }
}