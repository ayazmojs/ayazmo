import fs from 'node:fs';
import path from 'node:path';

export function isAyazmoProject(directory: string = process.cwd()): boolean {
  // Implement logic to validate Ayazmo project (e.g., check for specific files)
  const configFile = path.join(directory, 'ayazmo.config.js');
  return fs.existsSync(configFile);
}