import fs from 'node:fs'
import path from 'node:path'

// Optional: Function to list all plugins
export default function listPlugins (pluginsRoot: string): string[] {
  return fs.readdirSync(pluginsRoot).filter((file) => fs.statSync(path.join(pluginsRoot, file)).isDirectory())
};
