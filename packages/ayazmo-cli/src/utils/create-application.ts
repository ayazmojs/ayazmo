import path from 'node:path';
import fs from 'node:fs';
import { determinePackageManager, runInstall, initializeGitRepo } from '@ayazmo/utils';
import { cloneRepository } from './download-from-github.js';
import { askUserForPackageManager, askUserWhereToCreateApp, askUserToCreateGitRepo } from './prompts.js';
import { APP_TEMPATE_REPO } from '@ayazmo/utils';

export async function createApplication() {
  console.log('Creating a new Ayazmo application...');

  let manager: 'npm' | 'yarn';

  const { hasYarn, hasNpm } = await determinePackageManager();

  if (!hasYarn && !hasNpm) {
    console.error('No package manager found. Please install npm or yarn and try again.');
    process.exit(1);
  }

  if (hasYarn && hasNpm) {
    const answer = await askUserForPackageManager();
    manager = answer.manager;
  } else {
    manager = hasYarn ? 'yarn' : 'npm';
  }

  const { directory } = await askUserWhereToCreateApp();

  // Initialize Git repository
  const { gitInit } = await askUserToCreateGitRepo();

  const appDirectory = path.resolve(process.cwd(), directory);

  // Create directory if it doesn't exist
  if (directory !== '.' && !fs.existsSync(appDirectory)) {
    fs.mkdirSync(appDirectory, { recursive: true });
  }

  console.log(`Creating a new Ayazmo application in ${appDirectory}...`);

  try {
    // Download and extract the template
    await cloneRepository(APP_TEMPATE_REPO, appDirectory);
    console.log('Application files created.');

    await runInstall(manager, appDirectory);
    console.log('Dependencies installed.');

    if (gitInit) {
      await initializeGitRepo(appDirectory);
      console.log('Initialized a new Git repository.');
    }

    console.log(`Ayazmo application successfully created in ${appDirectory}`);
  } catch (error) {
    console.error(error);
  }
}
