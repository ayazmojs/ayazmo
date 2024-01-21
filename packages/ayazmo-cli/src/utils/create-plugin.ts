import path from 'node:path';
import { cloneRepository } from './download-from-github.js';
import { sleep, PLUGINS_ROOT } from '@ayazmo/utils'
import { askUserForPluginName } from "./prompts.js";
import CliLogger from './cli-logger.js';

export async function createPlugin() {
  CliLogger.info('Checking environment...');

  await sleep(5000);
  const answers = await askUserForPluginName();
  const pluginName = answers.name;
  const pluginsDir = path.join(PLUGINS_ROOT, pluginName);

  CliLogger.info(`Creating a new plugin in ${pluginsDir}...`);

  try {
    // Specify the GitHub repository
    const repo = 'ayazmojs/ayazmo-plugin-template';

    // Download and extract the template
    await cloneRepository(repo, pluginsDir);
    CliLogger.success(`Plugin ${pluginName} created successfully in ${pluginsDir}`);
  } catch (error) {
    CliLogger.error(error);
  }
}