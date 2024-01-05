import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Define the function to get the version from package.json synchronously
export function getAyazmoVersion() {
  try {
    // Get the directory path of the current module
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const rootDir = __dirname.substring(0, __dirname.indexOf('ayazmo-cli') + 'ayazmo-cli'.length);
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    return packageJson.version;
  } catch (error) {
    // Handle possible errors
    console.error('Unable to read the version from package.json:', error);
    throw error;
  }
}