import inquirer from "inquirer"

export function askUserForTypeOfMigration() {
  return inquirer.prompt([
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

export function askUserForMigrationName() {
  return inquirer.prompt([
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

export function askUserWhichPlugin(availablePlugins: string[]) {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPlugin',
      message: 'Which plugin would you like to use?',
      choices: availablePlugins,
    },
  ]);
}