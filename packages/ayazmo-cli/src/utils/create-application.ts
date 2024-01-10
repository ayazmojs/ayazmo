import inquirer from 'inquirer';
import path from 'node:path';
import fs from 'node:fs';
import { determinePackageManager, runInstall, initializeGitRepo } from '@ayazmo/utils';
import { cloneRepository } from './download-from-github.js';

export async function createApplication() {
  console.log('Creating a new Ayazmo application...');

  let manager: 'npm' | 'yarn';

  const { hasYarn, hasNpm } = await determinePackageManager();

  if (!hasYarn && !hasNpm) {
    console.error('No package manager found. Please install npm or yarn and try again.');
    process.exit(1);
  }

  if (hasYarn && hasNpm) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'manager',
        message: 'Which package manager do you want to use?',
        choices: ['yarn', 'npm'],
      },
    ]);
    manager = answer.manager;
  } else {
    manager = hasYarn ? 'yarn' : 'npm';
  }

  const { directory } = await inquirer.prompt([
    {
      type: 'input',
      name: 'directory',
      message: 'In which folder would you like to create the app? (default: current folder)',
      default: '.',
    },
  ]);

  // Initialize Git repository
  const { gitInit } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'gitInit',
      message: 'Do you want to initialize a new Git repository?',
      default: true,
    },
  ]);

  const appDirectory = path.resolve(process.cwd(), directory);

  // Create directory if it doesn't exist
  if (directory !== '.' && !fs.existsSync(appDirectory)) {
    fs.mkdirSync(appDirectory, { recursive: true });
  }

  console.log(`Creating a new Ayazmo application in ${appDirectory}...`);

  // Specify the GitHub repository
  const repo = 'ayazmojs/ayazmo-app-template';

  try {
    // Download and extract the template
    await cloneRepository(repo, appDirectory);
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
