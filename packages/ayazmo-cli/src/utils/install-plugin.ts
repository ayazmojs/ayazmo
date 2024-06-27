import { isAyazmoProject } from "./is-ayazmo-project.js";
import CliLogger from "./cli-logger.js";
import fs from "node:fs";
import path from "node:path";
import { isPluginInstalled, installPackageInMonorepo, GLOBAL_CONFIG_FILE_NAME } from "@ayazmo/utils";
import { getPluginPaths } from "@ayazmo/core";
import { addPluginToConfig } from "./code-transform-utils.js";
import { globby } from 'globby'
import { runMigrations } from "./run-migrations.js";
import { amendConfigFile } from "@ayazmo/utils";

const writeFile = async (path: string, content: string) => {
  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path);
    writeStream.on("error", reject);
    writeStream.on("finish", resolve);
    writeStream.write(content);
    writeStream.end();
  });
};

export const installPlugin = async (pluginName: string) => {
  CliLogger.info(`Installing plugin ${pluginName}`);
  if (!isAyazmoProject()) {
    CliLogger.error("You must be in an Ayazmo project directory to install a plugin.");
    return;
  }

  if (await isPluginInstalled(pluginName)) {
    CliLogger.error(`Plugin ${pluginName} is already installed.`);
    return;
  }

  try {
    await installPackageInMonorepo(pluginName);
    const configFilePath = path.join(process.cwd(), GLOBAL_CONFIG_FILE_NAME);
    const pluginPaths = getPluginPaths(pluginName, { private: false });
    const pluginConfigPath = path.join(pluginPaths.config ?? '');
    const configFileSource = await fs.promises.readFile(configFilePath, 'utf8');
    // add the plugin to the plugins array in the ayazmo.config.js file
    const configFileUpdated = addPluginToConfig(configFileSource, pluginName);
    await writeFile(configFilePath, configFileUpdated);

    // check if the plugin has migrations
    const migrationsPath = pluginPaths.migrations;
    const migrationFiles = await globby(`${migrationsPath}/*.js`);
    if (migrationFiles.length > 0) {
      // run all migrationFiles one by one
      for (const migrationFile of migrationFiles) {
        // get the migration file name without the extension
        const migrationFileName = path.basename(migrationFile, '.js')
        CliLogger.info(`Running migration ${migrationFileName}`)
        await runMigrations()
      }

      CliLogger.success('Migrations run successfully!')
    }

    // amend the config file
    if (configFilePath && pluginConfigPath) {
      await amendConfigFile(configFilePath, pluginConfigPath);
    }
  } catch (error) {
    CliLogger.error(`Failed to install plugin ${pluginName}: ${error}`);
    return;
  }

  CliLogger.success(`Plugin ${pluginName} installed successfully.`);
};