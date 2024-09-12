import assert from "node:assert";
import { describe, it, before, after } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { amendConfigFile, removePluginConfig } from '../src/amend-config-file.js';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configFile = path.resolve(__dirname, '../__fixtures__/update-config-file/ayazmo.config.js');
const pluginConfigFile = path.resolve(__dirname, '../__fixtures__/update-config-file/plugin.config.js');
const initialConfigFile = path.resolve(__dirname, '../__fixtures__/update-config-file/initial.config.js');
const updatedConfigFile = path.resolve(__dirname, '../__fixtures__/update-config-file/updated.config.js');

async function importFresh(filePath) {
  // Append a query string to filePath to bypass cache
  const cacheBuster = `?update=${Date.now()}`;
  const newUrl = new URL(filePath + cacheBuster, import.meta.url).href;
  return import(newUrl);
}

describe('updateConfigFile', () => {
  before(() => {
    // Copy the initial config file to the updated config file
    fs.copyFileSync(initialConfigFile, updatedConfigFile);
  });

  after(() => {
    // Copy the initial config file to the updated config file
    fs.copyFileSync(initialConfigFile, updatedConfigFile);
  });

  it('should add a new plugin configuration to the app plugins array', async () => {
    // add plugin config to the app config file
    await amendConfigFile(configFile, pluginConfigFile);

    const configFileImport = await importFresh(configFile);
    const updatedConfigFileImport = await importFresh(updatedConfigFile);
    const configFileContents = configFileImport.default;
    const updatedConfigFileContents = updatedConfigFileImport.default;

    // updatedConfigFile should have one more plugin than configFile
    assert.notDeepEqual(configFileContents.plugins, updatedConfigFileContents.plugins);
  });

  it('should not add a new plugin configuration to the app plugins array if it already exists', async () => {
    // should not add plugin config to the app config file as it already exists from prev test
    await amendConfigFile(configFile, pluginConfigFile);

    // Read the contents of both files
    const configFileImport = await importFresh(configFile);
    const updatedConfigFileImport = await importFresh(updatedConfigFile);
    const configFileContents = configFileImport.default;
    const updatedConfigFileContents = updatedConfigFileImport.default;

    // Compare the contents of configFile and updatedConfigFile
    assert.notDeepEqual(configFileContents.plugins, updatedConfigFileContents.plugins);
  });

  it('should remove a plugin configuration from the app plugins array', async () => {
    await removePluginConfig(configFile, 'new-plugin-name-test');

    // Read the contents of both files
    const configFileImport = await importFresh(configFile);
    const updatedConfigFileImport = await importFresh(updatedConfigFile);
    const configFileContents = configFileImport.default;
    const updatedConfigFileContents = updatedConfigFileImport.default;

    // Compare the contents of configFile and updatedConfigFile
    assert.deepEqual(configFileContents.plugins, updatedConfigFileContents.plugins);
  });
});