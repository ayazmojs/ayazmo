import path from 'node:path'
import fs from 'node:fs/promises'
import { getPluginRoot } from '@ayazmo/core'
import type { PluginConfig } from '@ayazmo/types'
import CliLogger from './cli-logger.js'

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
  const imports: any[] = []
  for (const file of files) {
    try {
      const module = await import(file)
      if (module.default != null) {
        imports.push(module.default)
      } else {
        imports.push(module)
      }
    } catch (error) {
      CliLogger.warn(`Failed to import file ${file}: ${(error as Error).message}`)
    }
  }
  return imports
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
