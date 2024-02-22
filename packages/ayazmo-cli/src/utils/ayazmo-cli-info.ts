import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

export function getAyazmoVersion(): string {
  try {
    try {
      // local installation path
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'node_modules', 'ayazmo', 'package.json'), 'utf8'));
      return packageJson.version;
    } catch (error) { }

    try {
      const packageVersion = findAndParsePackageJsonVersion();
      return packageVersion ?? ''
    } catch (error) { }

  } catch (error) { }

  return ''
}

/**
 * Finds the package.json file starting from the given directory and moving up the directory tree.
 * If found, parses the file and returns the version field.
 * @param {number} maxLevelsUp The maximum number of directory levels to traverse upwards.
 * @returns {string|null} The version string from the found package.json or null if not found or if no version is specified.
 */
function findAndParsePackageJsonVersion(maxLevelsUp = 4): string | null {
  let currentDir = dirname(fileURLToPath(import.meta.url));
  const root = dirname(currentDir);
  let levelsTraversed = 0;

  while (currentDir !== root && levelsTraversed < maxLevelsUp) {
    const possiblePath = join(currentDir, 'package.json');
    if (existsSync(possiblePath)) {
      // Read and parse package.json
      const packageJson = JSON.parse(readFileSync(possiblePath, 'utf8'));
      return packageJson.version || null;
    }
    currentDir = dirname(currentDir);
    levelsTraversed++;
  }

  return null; // package.json not found or no version found within the limit
}