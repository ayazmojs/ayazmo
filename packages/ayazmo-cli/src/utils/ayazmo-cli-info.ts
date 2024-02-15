import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import CliLogger from './cli-logger.js';

export function getAyazmoVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'node_modules', 'ayazmo', 'package.json'), 'utf8'));
    return packageJson.version;
  } catch (error) {
    CliLogger.error('Unable to read the version from package.json:');
    CliLogger.error(error);
  }
}