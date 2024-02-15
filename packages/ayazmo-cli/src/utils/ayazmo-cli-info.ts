import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import CliLogger from './cli-logger.js';

export function findRootPackageJsonPath(startingDir: string): string | null {
  let currentDir = startingDir;
  while (currentDir !== '/') {
    const packageJsonPath = join(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentDir = dirname(currentDir);
  }
  return null; // package.json was not found in any parent directory
}

export function getAyazmoRootPackageJsonPath() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = findRootPackageJsonPath(__dirname);
  if (!packageJsonPath) {
    throw new Error('package.json not found');
  }
  return packageJsonPath;
}

export function getAyazmoVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(getAyazmoRootPackageJsonPath(), 'utf8'));
    return packageJson.version;
  } catch (error) {
    CliLogger.error('Unable to read the version from package.json:');
    CliLogger.error(error);
  }
}