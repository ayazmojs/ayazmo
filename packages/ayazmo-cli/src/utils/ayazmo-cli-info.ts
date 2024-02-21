import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function getAyazmoVersion() {
  try {
    // Path for local development
    let packageJsonPath = join(process.cwd(), 'node_modules', 'ayazmo', 'package.json');

    // Attempt to dynamically import the package to see if it's accessible
    try {
      // @ts-ignore
      const modulePath = await import('ayazmo/package.json', {
        assert: { type: 'json' }
      });
      packageJsonPath = modulePath.default;
    } catch (error) {
      // If the import fails, it might be installed globally, handle accordingly
      // This is a simplistic approach and might not work in all environments
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    // ignore the error
  }
}