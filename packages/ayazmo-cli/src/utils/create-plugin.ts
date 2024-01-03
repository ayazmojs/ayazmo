import inquirer from "inquirer"
import path from 'node:path';
import fs from 'node:fs';
import { isAyazmoProject } from './is-ayazmo-project.js';
import { cloneRepository } from './download-from-github.js';

export async function createPlugin() {
  if (!isAyazmoProject(process.cwd())) {
    console.error('This command must be run in the root of an Ayazmo project.');
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What is the name of your plugin?',
      validate: (input) => !!input || 'Please enter a valid plugin name.'
    }
  ]);

  const pluginName = answers.name;
  const pluginsDir = path.join(process.cwd(), 'src', 'plugins', pluginName);

  if (fs.existsSync(pluginsDir)) {
    console.error(`A plugin with the name "${pluginName}" already exists.`);
    return;
  }

  console.log(`Creating a new plugin in ${pluginsDir}...`);

  try {
    // Specify the GitHub repository
    const repo = 'ayazmojs/ayazmo-plugin-template';

    // Download and extract the template
    await cloneRepository(repo, pluginsDir);
    console.log(`Plugin ${pluginName} created successfully.`);
  } catch (error) {
    console.error('Failed to create plugin:', error);
  }
}