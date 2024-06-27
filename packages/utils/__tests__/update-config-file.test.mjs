import assert from "node:assert";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { amendConfigFile, removePluginConfig } from '../src/amend-config-file.js';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configFile = path.resolve(__dirname, '../__fixtures__/update-config-file/ayazmo.config.js');
const pluginConfigFile = path.resolve(__dirname, '../__fixtures__/update-config-file/plugin.config.js');
const initialConfigFile = path.resolve(__dirname, '../__fixtures__/update-config-file/initial.config.js');
const updatedConfigFile = path.resolve(__dirname, '../__fixtures__/update-config-file/updated.config.js');

describe('updateConfigFile', () => {
  it('should add a new plugin configuration to the app plugins array', async () => {
    // ensure clean state
    fs.copyFileSync(initialConfigFile, configFile);
    await amendConfigFile(configFile, pluginConfigFile);

    // Read the contents of both files
    const configFileImport = await import(configFile);
    const updatedConfigFileImport = await import(updatedConfigFile);
    const configFileContents = configFileImport.default;
    const updatedConfigFileContents = updatedConfigFileImport.default;
    // console.log(configFileContents.plugins, updatedConfigFileContents.plugins)

    // Compare the contents of configFile and updatedConfigFile
    assert.deepEqual(configFileContents, updatedConfigFileContents);
  });

  it('should not add a new plugin configuration to the app plugins array if it already exists', async () => {
    await amendConfigFile(configFile, pluginConfigFile);

    // Read the contents of both files
    const configFileImport = await import(configFile);
    const updatedConfigFileImport = await import(updatedConfigFile);
    const configFileContents = configFileImport.default;
    const updatedConfigFileContents = updatedConfigFileImport.default;
    console.log(configFileContents.plugins, updatedConfigFileContents.plugins)

    // Compare the contents of configFile and updatedConfigFile
    assert.deepEqual(configFileContents, updatedConfigFileContents);
  });

  it('should remove a plugin configuration from the app plugins array', async () => {
    await removePluginConfig(configFile, 'new-plugin-name-test');

    // Read the contents of both files
    const configFileImport = await import(configFile);
    const updatedConfigFileImport = await import(updatedConfigFile);
    const configFileContents = configFileImport.default;
    const updatedConfigFileContents = updatedConfigFileImport.default;

    // Compare the contents of configFile and updatedConfigFile
    assert.deepEqual(configFileContents, updatedConfigFileContents);
  });
});