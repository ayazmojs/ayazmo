import path from 'node:path';
import { cloneRepository } from './download-from-github.js';
import { PLUGINS_ROOT } from '@ayazmo/utils'
import { askUserForPluginName } from "./prompts.js";
import CliLogger from './cli-logger.js';
import PackagetJson from '@npmcli/package-json';

export async function createPlugin() {
  CliLogger.info('Checking environment...');

  const answers = await askUserForPluginName();
  const pluginName = answers.name;
  const pluginsDir = path.join(PLUGINS_ROOT, pluginName);

  CliLogger.info(`Creating a new plugin in ${pluginsDir}...`);

  try {
    // Specify the GitHub repository
    const repo = 'ayazmojs/ayazmo-plugin-template';

    // Download and extract the template
    await cloneRepository(repo, pluginsDir);
    const pkgJson = await PackagetJson.load(pluginsDir)
    pkgJson.update({
      name: pluginName,
      description: pluginName.replaceAll('-', ' '),
      keywords: [
        `${pluginName}`
      ]
    })
    await pkgJson.save()

    CliLogger.success(`Plugin ${pluginName} created successfully in ${pluginsDir}. You may enable this plugin in ayazmo.config.js`);
  } catch (error) {
    CliLogger.error(error);
  }
}