import path from 'node:path';
import kleur from 'kleur';
import { createSpinner } from 'nanospinner';
import { cloneRepository } from './download-from-github.js';
import { sleep, PLUGINS_ROOT } from '@ayazmo/utils'
import { askUserForPluginName } from "./prompts.js";

export async function createPlugin() {
  const spinner = createSpinner('Checking environment...').start();

  await sleep(5000);
  spinner.success({ text: kleur.green('Env check passed!'), mark: kleur.green("√") })

  const answers = await askUserForPluginName();

  const validateSpinner = createSpinner('Installing...').start();

  const pluginName = answers.name;
  const pluginsDir = path.join(PLUGINS_ROOT, pluginName);

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