// core/src/utils/plugin-cache.ts
import { AyazmoInstance, PluginConfig } from '@ayazmo/types'
import { createAyazmoFolders } from './ayazmo-folder.js'
import { glob } from 'glob'
import path from 'node:path'
import fs from 'node:fs'

export class PluginCache {
  private readonly app: AyazmoInstance
  private readonly cacheRoot: string

  constructor(app: AyazmoInstance) {
    this.app = app
    this.cacheRoot = path.resolve(process.cwd(), '.ayazmo/plugins')
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

    // Verify the folder exists
    if (!fs.existsSync(this.cacheRoot)) {
      throw new Error(`Failed to create plugin cache directory at ${this.cacheRoot}`)
    }
  }

  /**
   * Get the cache path for a specific plugin
   */
  private getPluginCachePath(pluginName: string): string {
    const cachePath = path.join(this.cacheRoot, pluginName)
    this.app.log.debug(`Generated cache path for plugin ${pluginName}: ${cachePath}`)
    return cachePath
  }

  /**
   * Copy a directory recursively
   */
  private copyDirRecursive(source: string, target: string): void {
    // Create target directory
    fs.mkdirSync(target, { recursive: true })

    // Read source directory
    const files = fs.readdirSync(source)

    for (const file of files) {
      // Skip TypeScript declaration files
      if (file.endsWith('.d.ts')) {
        continue
      }

      const sourcePath = path.join(source, file)
      const targetPath = path.join(target, file)
      
      const stat = fs.statSync(sourcePath)
      
      if (stat.isDirectory()) {
        // Recursively copy subdirectory
        this.app.log.debug(`Copying directory ${sourcePath} to ${targetPath}`)
        this.copyDirRecursive(sourcePath, targetPath)
      } else {
        // Copy file
        this.app.log.debug(`Copying file ${sourcePath} to ${targetPath}`)
        fs.copyFileSync(sourcePath, targetPath)
      }
    }
  }

  /**
   * Copy a plugin's entities to cache
   */
  private async cachePlugin(plugin: PluginConfig, nodeModulesPath: string): Promise<void> {
    const pluginRoot = path.join(nodeModulesPath, plugin.name)
    const sourceEntitiesPath = path.join(pluginRoot, 'dist', 'entities')
    const cacheEntitiesPath = path.join(this.getPluginCachePath(plugin.name), 'entities')

    try {
      this.app.log.debug(`Attempting to cache plugin ${plugin.name} entities`)
      this.app.log.debug(`Source entities path: ${sourceEntitiesPath}`)
      this.app.log.debug(`Cache entities path: ${cacheEntitiesPath}`)

      if (!fs.existsSync(sourceEntitiesPath)) {
        this.app.log.debug(`No entities found for plugin ${plugin.name}`)
        return
      }

      // Copy only the entities directory
      this.copyDirRecursive(sourceEntitiesPath, cacheEntitiesPath)
      
      // Verify the copy worked
      if (!fs.existsSync(cacheEntitiesPath)) {
        throw new Error(`Cache entities path ${cacheEntitiesPath} was not created after copy operation`)
      }

      this.app.log.debug(`Successfully cached plugin ${plugin.name} entities`)
    } catch (error) {
      this.app.log.error(`Failed to cache plugin ${plugin.name} entities: ${error.message}`)
      throw error
    }
  }

  /**
   * Cache all public plugins entities
   */
  public async cachePublicPlugins(plugins: PluginConfig[], nodeModulesPath: string): Promise<void> {
    await this.initializeCache()
    
    // Filter public plugins (those in node_modules) that don't have custom paths
    const pluginsToCache = plugins.filter(plugin => 
      !plugin.settings?.private && 
      !plugin.settings?.path
    )
    
    this.app.log.debug(`Found ${pluginsToCache.length} public plugins to cache`)
    
    // Cache plugins in parallel
    await Promise.all(
      pluginsToCache.map(plugin => this.cachePlugin(plugin, nodeModulesPath))
    )
  }

  /**
   * Get all cached plugin entity paths
   */
  public async getCachedPaths(): Promise<Map<string, string>> {
    const paths = new Map<string, string>()
    const pluginDirs = await glob('*/entities', { 
      cwd: this.cacheRoot,
      absolute: true
    })

    for (const dir of pluginDirs) {
      const pluginName = path.basename(path.dirname(dir))
      paths.set(pluginName, dir)
    }

    return paths
  }
}