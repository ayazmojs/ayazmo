import path from 'node:path'
import { PLUGINS_ROOT } from './constants.js'

// Root paths
export const ROOT_DIR = process.cwd()
export const PLUGINS_DIST_ROOT = path.join(ROOT_DIR, 'dist', 'plugins')
export const NODE_MODULES_ROOT = path.join(ROOT_DIR, 'node_modules')
export const AYAZMO_CACHE_ROOT = path.join(ROOT_DIR, '.ayazmo', 'plugins')

// Plugin path generators
export function getPrivatePluginEntityPath(pluginName: string): string {
  return path.join(PLUGINS_DIST_ROOT, pluginName, 'src', 'entities')
}

export function getPrivatePluginMigrationPath(pluginName: string): string {
  return path.join(PLUGINS_ROOT, pluginName, 'src', 'migrations')
}

export function getPublicPluginEntityPath(pluginName: string): string {
  return path.join(NODE_MODULES_ROOT, pluginName, 'dist', 'entities')
}

export function getPublicPluginMigrationPath(pluginName: string): string {
  return path.join(NODE_MODULES_ROOT, pluginName, 'src', 'migrations')
}

export function getCustomPluginEntityPath(customPath: string, pluginName: string): string {
  return path.join(customPath, pluginName, 'dist', 'entities')
}

export function getCustomPluginMigrationPath(customPath: string, pluginName: string): string {
  return path.join(customPath, pluginName, 'src', 'migrations')
}

// Cache path generators
export function getPluginCachePath(pluginName: string): string {
  return path.join(AYAZMO_CACHE_ROOT, pluginName)
}

export function getPluginCacheEntityPath(pluginName: string): string {
  return path.join(AYAZMO_CACHE_ROOT, pluginName, 'src', 'entities')
}

// Plugin path resolver
export interface IPluginPathPair {
  entityPath: string;
  migrationPath: string;
}

export function resolvePluginPaths(pluginName: string, settings?: { private?: boolean, path?: string }): IPluginPathPair {
  if (settings?.path) {
    return {
      entityPath: getCustomPluginEntityPath(settings.path, pluginName),
      migrationPath: getCustomPluginMigrationPath(settings.path, pluginName)
    }
  }

  if (settings?.private) {
    return {
      entityPath: getPrivatePluginEntityPath(pluginName),
      migrationPath: getPrivatePluginMigrationPath(pluginName)
    }
  }

  return {
    entityPath: getPublicPluginEntityPath(pluginName),
    migrationPath: getPublicPluginMigrationPath(pluginName)
  }
} 