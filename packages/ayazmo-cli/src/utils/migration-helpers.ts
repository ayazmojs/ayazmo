import path from 'node:path'
import fs from 'node:fs/promises'
import { getPluginRoot } from '@ayazmo/core'
import type { PluginConfig } from '@ayazmo/types'
import { MetadataStorage } from '@ayazmo/types'
import CliLogger from './cli-logger.js'
import { ensureAyazmoSubfolder } from './ayazmo-folder.js'

interface EntityModule {
  default?: any
  [key: string]: any
}

function resolveEntityPath (filePath: string, isNodeModule: boolean): string {
  if (isNodeModule) {
    return new URL(filePath, import.meta.url).pathname
  }
  return filePath
}

export async function getEntityFiles (directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory)
    return files.filter(file => file.endsWith('.mjs') || file.endsWith('.js'))
      .map(file => path.join(directory, file))
  } catch (error) {
    CliLogger.warn(`Failed to read directory ${directory}: ${(error as Error).message}`)
    return []
  }
}

export async function importEntityFiles (files: string[]): Promise<any[]> {
  const entities: any[] = []

  for (const file of files) {
    try {
      const isNodeModule = file.includes('node_modules')
      const resolvedPath = resolveEntityPath(file, isNodeModule)

      const module: EntityModule = await import(resolvedPath)

      const entity = module.default ?? Object.values(module).find(exp =>
        typeof exp === 'function' && exp.prototype?.constructor !== undefined
      )

      if (entity !== undefined) {
        if (entity[MetadataStorage.PATH_SYMBOL] === undefined) {
          entity[MetadataStorage.PATH_SYMBOL] = file
        }
        entities.push(entity)
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to import entity from ${file}:`, error.message)
      }
    }
  }
  return entities
}

export async function hasEntities (entitiesPath: string): Promise<boolean> {
  const entityFiles = await getEntityFiles(entitiesPath)
  return entityFiles.length > 0
}

export async function filterPluginsWithEntities (plugins: PluginConfig[]): Promise<PluginConfig[]> {
  const pluginsWithEntities = await Promise.all(
    plugins.map(async plugin => {
      const entitiesDir = path.join(getPluginRoot(plugin.name, plugin.settings), 'dist', 'entities')
      const hasEntityFiles = await hasEntities(entitiesDir)
      return hasEntityFiles ? plugin : null
    })
  )
  return pluginsWithEntities.filter((plugin): plugin is PluginConfig => plugin !== null)
}

export function getMigrationPath (plugin: PluginConfig): string {
  return path.join(getPluginRoot(plugin.name, plugin.settings ?? {}), 'src', 'migrations')
}

export function getEntitiesPath (plugin: PluginConfig): string {
  return path.join(getPluginRoot(plugin.name, plugin.settings ?? {}), 'dist', 'entities')
}

/**
 * Copies entity files from a plugin's entities directory to a temporary location
 * @param pluginName Name of the plugin
 * @param entitiesPath Path to the plugin's entities directory
 * @returns Promise<string> Path to the temporary directory containing copied entities
 */
export async function copyEntitiesToTemp (pluginName: string, entitiesPath: string): Promise<string> {
  try {
    // Ensure plugin-specific temp folder exists
    const tempPath = await ensureAyazmoSubfolder(`entities/${pluginName}`)

    // Get entity files from plugin
    const entityFiles = await getEntityFiles(entitiesPath)

    // Copy each entity file to temp location
    for (const file of entityFiles) {
      const fileName = path.basename(file)
      const targetPath = path.join(tempPath, fileName)
      await fs.copyFile(file, targetPath)
    }

    return tempPath
  } catch (error) {
    if (error instanceof Error) {
      CliLogger.error(`Failed to copy entities for plugin ${pluginName}: ${error.message}`)
    }
    throw error
  }
}
