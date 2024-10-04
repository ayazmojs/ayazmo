import importGlobalConfig from './import-global-config.js'
import path from 'node:path'
import { PluginConfig } from '@ayazmo/types'

export default async function getRegisteredPlugins (): Promise<PluginConfig[]> {
  const enrichedPlugins: PluginConfig[] = []
  const config = await importGlobalConfig()

  if (!Array.isArray(config.plugins)) {
    throw new Error('Expected plugins to be an array')
  }

  for (const plugin of config.plugins) {
    if (plugin.settings?.private === true) {
      enrichedPlugins.push({ ...plugin, path: path.join(process.cwd(), 'src', 'plugins', plugin.name) })
    } else {
      enrichedPlugins.push({ ...plugin, path: path.join(process.cwd(), 'node_modules', plugin.name) })
    }
  }

  return enrichedPlugins
}
