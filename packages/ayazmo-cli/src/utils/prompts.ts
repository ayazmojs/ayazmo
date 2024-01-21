import inquirer from "inquirer"
import path from "node:path"
import fs from "node:fs"

export async function askUserForTypeOfMigration() {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What type of migration do you want to create?',
      choices: [
        {
          name: 'Create migration files from existing Entities',
          value: 'entities',
        },
        {
          name: 'Create an empty migration file',
          value: 'empty',
        },
      ],
    },
  ]);
}

export async function askUserForMigrationName() {
  return await inquirer.prompt([
    {
      type: 'input',
      name: 'filename',
      message: 'What should be the name of your migration file (optional)?',
      validate: (input) => {
        // Second validation check (example)
        function checkForSpecialCharacters() {
          // Custom logic to check for special characters
          const specialCharPattern = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
          return !specialCharPattern.test(input) || 'Migration name should not contain special characters.';
        }

        const noSpecialCharResult = checkForSpecialCharacters();
        if (noSpecialCharResult !== true) {
          return noSpecialCharResult; // Return the error message if validation fails
        }

        // If all checks pass, return true
        return true;
      },
    },
  ]);
}

export async function askUserWhichPlugin(availablePlugins: string[]) {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPlugin',
      message: 'Which plugin would you like to use?',
      choices: availablePlugins,
    },
  ]);
}

export async function askUserForPluginName() {
  return await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What should be the name of your plugin?',
      validate: (input) => {
        // First validation check
        function checkInputNotEmpty() {
          return !!input || 'Please enter a valid plugin name.';
        }

        // Second validation check (example)
        function checkForSpecialCharacters() {
          // Custom logic to check for special characters
          const specialCharPattern = /[!@#$%^&*()_+\=\[\]{};':"\\|,.<>\/?]+/;
          return !specialCharPattern.test(input) || 'Plugin name should not contain special characters.';
        }

        const notEmptyResult = checkInputNotEmpty();
        if (notEmptyResult !== true) {
          return notEmptyResult; // Return the error message if validation fails
        }

        const noSpecialCharResult = checkForSpecialCharacters();
        if (noSpecialCharResult !== true) {
          return noSpecialCharResult; // Return the error message if validation fails
        }

        const pluginsDir = path.join(process.cwd(), 'src', 'plugins', input);
        if (fs.existsSync(pluginsDir)) {
          return `A plugin with the name "${input}" already exists in ${pluginsDir}.`
        }

        const nodeModulesPluginsDirectory = path.join(process.cwd(), 'node_modules', input);
        if (fs.existsSync(nodeModulesPluginsDirectory)) {
          return `A plugin with the name "${input}" is already installed in ${nodeModulesPluginsDirectory}.`
        }

        // If all checks pass, return true
        return true;
      }
    }
  ]);
}

export async function askUserForPackageManager() {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'manager',
      message: 'Which package manager do you prefer?',
      choices: ['yarn', 'npm'],
    },
  ]);
}

export async function askUserWhereToCreateApp() {
  return await inquirer.prompt([
    {
      type: 'input',
      name: 'directory',
      message: 'In which folder would you like to create the app? (default: current folder)',
      default: '.',
    },
  ]);
}

export async function askUserToCreateGitRepo() {
  return await inquirer.prompt([
    {
      type: 'confirm',
      name: 'gitInit',
      message: 'Do you want to initialize a new Git repository?',
      default: true,
    },
  ]);
}