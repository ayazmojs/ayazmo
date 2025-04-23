import path from 'node:path'
import { PluginConfig } from '@ayazmo/types'

/**
 * Enriches plugin configurations with path information if not already present
 * 
 * @param plugins Array of plugin configurations
 * @returns Array of plugin configurations with paths
 */
export default function getRegisteredPlugins(plugins: PluginConfig[]): PluginConfig[] {
  if (!Array.isArray(plugins)) {
    throw new Error('Expected plugins to be an array')
  }

  return plugins.map(plugin => {
    // If plugin already has a path, return it untouched
    if (plugin.path) {
      return plugin
    } 
    // Otherwise, add path based on private setting
    else if (plugin.settings?.private === true) {
      return { ...plugin, path: path.join(process.cwd(), 'dist', 'plugins', plugin.name, 'src') }
    } else {
      return { ...plugin, path: path.join(process.cwd(), 'node_modules', plugin.name) }
    }
  })
}