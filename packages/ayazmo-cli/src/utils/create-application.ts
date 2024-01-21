import path from 'node:path';
import fs from 'node:fs';
import { determinePackageManager, runInstall, initializeGitRepo, APP_TEMPATE_REPO } from '@ayazmo/utils';
import { cloneRepository } from './download-from-github.js';
import { askUserForPackageManager, askUserWhereToCreateApp, askUserToCreateGitRepo } from './prompts.js';
import CliLogger from './cli-logger.js';

export async function createApplication() {
  CliLogger.info('Creating a new Ayazmo application...');

  let manager: 'npm' | 'yarn';

  try {

    const { hasYarn, hasNpm } = await determinePackageManager();

    if (!hasYarn && !hasNpm) {
      throw new Error('No package manager found. Please install npm or yarn and try again.');
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

    CliLogger.info(`Creating a new Ayazmo application in ${appDirectory}...`);


    // Download and extract the template
    await cloneRepository(APP_TEMPATE_REPO, appDirectory);
    CliLogger.success('Application files created.');

    await runInstall(manager, appDirectory);
    CliLogger.success('Dependencies installed.');

    if (gitInit) {
      await initializeGitRepo(appDirectory);
      CliLogger.success('Initialized a new Git repository.');
    }

    CliLogger.info(`Ayazmo application successfully created in ${appDirectory}`);
  } catch (error) {
    CliLogger.error(error);
    process.exit(1);
  }
}
