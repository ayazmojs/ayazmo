import { MikroORM } from '@mikro-orm/core';
import path from 'node:path';
import fs from 'node:fs';
import kleur from 'kleur';
import { createSpinner } from 'nanospinner';
import inquirer from "inquirer"
import { isAyazmoProject } from './is-ayazmo-project.js';
import { sleep, importGlobalConfig, listPlugins } from '@ayazmo/utils'

export async function createMigration() {
  let orm: MikroORM;
  let migrationPath: string;
  let availablePlugins: string[];
  let migration: any;
  const spinner = createSpinner('Checking environment...').start();
  const cwd = process.cwd();

  if (!isAyazmoProject(cwd)) {
    spinner.error({ text: kleur.red('This command must be run in the root of an Ayazmo project.') });
    process.exit(1);
  }

  try {
    availablePlugins = listPlugins(path.join(cwd, 'src', 'plugins'));

    if (availablePlugins.length === 1) {
      migrationPath = path.join(cwd, 'src', 'plugins', availablePlugins[0], 'src', 'migrations');
    } else if (availablePlugins.length > 1) {
      spinner.stop();
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedPlugin',
          message: 'Which plugin do you want to use?',
          choices: availablePlugins,
        },
      ]);
      migrationPath = path.join(cwd, 'src', 'plugins', answers.selectedPlugin, 'src', 'migrations');
    } else {
      spinner.error({ text: kleur.red('No plugins available in this project.'), mark: kleur.red("×") });
      process.exit(1);
    }

    // Create the migrationPath folder if it doesn't exist
    if (!fs.existsSync(migrationPath)) {
      fs.mkdirSync(migrationPath, { recursive: true });
    }

    migration = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'What is the name of your migration file?',
        validate: (input) => {
          // First validation check
          function checkInputNotEmpty() {
            return !!input || 'Please enter a valid migration name.';
          }

          // Second validation check (example)
          function checkForSpecialCharacters() {
            // Custom logic to check for special characters
            const specialCharPattern = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
            return !specialCharPattern.test(input) || 'Migration name should not contain special characters.';
          }

          const notEmptyResult = checkInputNotEmpty();
          if (notEmptyResult !== true) {
            return notEmptyResult; // Return the error message if validation fails
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
  } catch (error) {
    spinner.error({ text: kleur.red('Failed to list available plugins'), mark: kleur.red("×") });
    process.exit(1);
  }

  // Check for ayazmo.config.js in the current working directory
  const configPath: string = path.join(cwd, 'ayazmo.config.js');

  try {
    // Import the global config
    const globalConfig = await importGlobalConfig(configPath);

    // Initialize MikroORM
    orm = await MikroORM.init({
      migrations: {
        snapshot: false,
      },
      discovery: {
        warnWhenNoEntities: false
      },
      entities: [],
      entitiesTs: [],
      debug: false,
      type: 'postgresql',
      ...globalConfig.database
    });
  } catch (error) {
    spinner.error({ text: kleur.red('Failed to initilise ORM. Please check your database settings'), mark: kleur.red("×") });
    process.exit(1);
  }

  if (!(await orm.isConnected())) {
    spinner.error({ text: kleur.red('Failed to connect to the database. Please ensure your ayazmo.config.js file has the correct DB credentials.'), mark: kleur.red("×") });
    process.exit(1);
  }

  await sleep(5000);
  spinner.success({ text: kleur.green('Env check passed!'), mark: kleur.green("√") })

  const migratorSpinner = createSpinner('Setting up migrations...').start();

  // Use MikroORM's Migrator to create a new migration
  const migrator = orm.getMigrator();
  const pendingMigrations = await migrator.getPendingMigrations();

  if (pendingMigrations && pendingMigrations.length > 0) {
    orm.close(true);
    migratorSpinner.warn({ text: kleur.yellow('There are pending migrations. Please run them before creating a new one.'), mark: kleur.red("×") });
    process.exit(1);
  }

  try {
    const { fileName } = await migrator.createMigration(migrationPath, true, false, migration.filename); // You can also pass a path and pattern here
    migratorSpinner.success({ text: kleur.green(`Successfully created migration: ${fileName}`), mark: kleur.green("√") });
  } catch (error) {
    migratorSpinner.error({ text: kleur.red('Failed to create migration.'), mark: kleur.red("×") });
    // console.error('Failed to create migration:', error.message);
  } finally {
    await orm.close(true);
    process.exit(0);
  }
}
