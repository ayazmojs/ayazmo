import inquirer from "inquirer"
import path from 'node:path';
import fs from 'node:fs';
import kleur from 'kleur';
import { createSpinner } from 'nanospinner';
import { isAyazmoProject } from './is-ayazmo-project.js';
import { cloneRepository } from './download-from-github.js';
import { sleep } from '@ayazmo/utils'

export async function createPlugin() {
  const spinner = createSpinner('Checking environment...').start();

  if (!isAyazmoProject(process.cwd())) {
    spinner.error({ text: kleur.red('This command must be run in the root of an Ayazmo project.') });
    process.exit(1);
  }

  await sleep(5000);
  spinner.success({ text: kleur.green('Env check passed!'), mark: kleur.green("√") })

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What is the name of your plugin?',
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

  const validateSpinner = createSpinner('Installing...').start();

  const pluginName = answers.name;
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins', pluginName);

  validateSpinner.update({ text: `Creating a new plugin in ${pluginsDir}...` });

  try {
    // Specify the GitHub repository
    const repo = 'ayazmojs/ayazmo-plugin-template';

    // Download and extract the template
    await cloneRepository(repo, pluginsDir);
    validateSpinner.stop({ text: kleur.green(`Plugin ${kleur.italic(pluginName)} created successfully in ${pluginsDir}`), mark: kleur.green("√") });
  } catch (error) {
    spinner.error({ text: kleur.red('Failed to create plugin:'), mark: kleur.red("×") });
    spinner.error({ text: kleur.red(error) });
  }
}