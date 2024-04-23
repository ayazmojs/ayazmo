// check if the plugin is installed in the plugins array in the ayazmo.config.js file
// if it is, check if the plugin has migrations and ask the user if should be removed from database and migrations
// write the ayazmo.config.js file with the updated plugins array
// run yarn or npm uninstall to remove the plugin from the project

import { isAyazmoProject } from "./is-ayazmo-project.js";
import CliLogger from "./cli-logger.js";
import path from "node:path";
import fs from "node:fs";
import { execa } from 'execa';
import { PluginConfig } from "@ayazmo/types";
import { getPluginPaths } from "@ayazmo/core";
import { getPackageManager } from "@ayazmo/utils";
import { globby } from 'globby'
import { askUserToConfirmDowngradeMigrations } from "./prompts.js";
import { removePluginFromConfig } from "./code-transform-utils.js";
import { downMigrations } from "./down-migrations.js";

const writeFile = async (path: string, content: string) => {
  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    writeStream.on("error", reject);
    writeStream.on("finish", resolve);
    writeStream.write(content);
    writeStream.end();
  });
};

export const removePlugin = async (pluginName: string): Promise<void> => {
  CliLogger.info(`Removing plugin ${pluginName}`);
  if (!isAyazmoProject()) {
    CliLogger.error("You must be in an Ayazmo project directory to remove a plugin.");
    return;
  }

  // get the ayazmo.config.js file path
  const configFilePath = path.join(process.cwd(), 'ayazmo.config.js');

  // dynamically import the ayazmo.config.js file es6 module
  const configFileImport = await import(configFilePath);
  const configFile = configFileImport.default;

  // check if the plugin is installed in the plugins array
  const plugin: PluginConfig | undefined = configFile.plugins.find((plugin: PluginConfig) => plugin.name === pluginName);

  if (!plugin) {
    CliLogger.error(`Plugin ${pluginName} is not installed because it is not in the plugins array in the ayazmo.config.js file.`);
    return;
  }

  // get the plugin root directory
  const pluginPaths = getPluginPaths(pluginName, plugin.settings);

  // check if the plugin has migrations
  const migrationsPath = pluginPaths.migrations;
  const migrationFiles = await globby(`${migrationsPath}/*.js`);
  if (migrationFiles.length > 0) {
    // list the migration filenames one on each line
    const migrationNames = migrationFiles.map(migrationFile => path.basename(migrationFile, '.js'))
    CliLogger.info(`The following migrations will be downgraded: ${migrationNames.join(', ')}`)

    const { confirm } = await askUserToConfirmDowngradeMigrations()

    if (!confirm) {
      CliLogger.info('Migrations not downgraded.')
      return;
    }

    // down all migrationFiles one by one
    for (const migrationFile of migrationFiles) {
      // get the migration file name without the extension
      const migrationFileName = path.basename(migrationFile, '.js')
      CliLogger.info(`Downgrading migration ${migrationFileName}`)
      await downMigrations(migrationFileName.replace('Migration', ''))
    }

    CliLogger.success('Migrations downgraded successfully!')
  }

  // read the ayazmo.config.js file source code
  const configFileSource = await fs.promises.readFile(configFilePath, 'utf8');

  // transform the ayazmo.config.js file source code using the utility function
  const transformedConfigFileSource = removePluginFromConfig(configFileSource, pluginName);

  //write the modified source code back to the ayazmo.config.js file
  await writeFile(configFilePath, transformedConfigFileSource);

  // run yarn or npm uninstall to remove the plugin from the project
  const packageManager = await getPackageManager();
  CliLogger.info(`Uninstalling plugin ${pluginName} with ${packageManager}`)
  await uninstallPluginWithPackageManager(pluginName, packageManager);
};

const uninstallPluginWithPackageManager = async (pluginName: string, packageManager: string) => {
  // uninstall the plugin using the package manager from getPackageManager
  if (packageManager === "yarn") {
    await uninstallPluginFromYarn(pluginName);
  } else {
    await uninstallPluginFromNpm(pluginName);
  }
};

const uninstallPluginFromYarn = async (pluginName: string) => {
  // uninstall the plugin using yarn
  const { stderr } = await execa("yarn", ["remove", pluginName, "-W"], { cwd: process.cwd(), stdio: 'inherit' });

  CliLogger.info("uninstalling with yarn")

  if (stderr) {
    CliLogger.error(`Failed to uninstall plugin ${pluginName}: ${stderr}`);
    return;
  }
};

const uninstallPluginFromNpm = async (pluginName: string) => {
  // uninstall the plugin using npm
  const { stderr } = await execa("npm", ["uninstall", pluginName], { cwd: process.cwd(), stdio: 'inherit' });

  if (stderr) {
    CliLogger.error(`Failed to uninstall plugin ${pluginName}: ${stderr}`);
    return;
  }
}