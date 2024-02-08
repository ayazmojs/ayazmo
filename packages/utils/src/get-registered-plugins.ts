import importGlobalConfig from "./import-global-config.js";
import path from "node:path";
import { AppConfig } from "@ayazmo/types";

export default async function getRegisteredPlugins() {
  let enrichedPlugins: any[] = [];
  const config: AppConfig = await importGlobalConfig()

  if (!Array.isArray(config.plugins)) {
    throw new Error('Expected plugins to be an array');
  }

  for (const plugin of config.plugins) {
    if (plugin.settings?.private) {
      enrichedPlugins.push({ ...plugin, path: path.join(process.cwd(), 'src', 'plugins', plugin.name) });
    } else {
      enrichedPlugins.push({ ...plugin, path: path.join(process.cwd(), 'node_modules', plugin.name) });
    }
  }

  return enrichedPlugins;
}