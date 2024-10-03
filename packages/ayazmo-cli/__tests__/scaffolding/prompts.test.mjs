import assert from "node:assert";
import { describe, it, after, before } from "node:test";

import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin,
  askUserForPluginName,
  askUserForPackageManager,
  askUserWhereToCreateApp,
  askUserToCreateGitRepo,
  askUserToConfirmDowngradeMigrations
} from '../../dist/utils/prompts.js';

import inquirer from 'inquirer';
import fs from 'node:fs';

describe('Prompt functions', async () => {
  before(() => {
    // Mock inquirer.prompt
    inquirer.prompt = async (questions) => {
      const question = questions[0];
      switch (question.name) {
        case 'type':
          return { type: 'entities' };
        case 'filename':
          return { filename: 'test-migration' };
        case 'selectedPlugin':
          return { selectedPlugin: 'plugin1' };
        case 'name':
          return { name: 'test-plugin' };
        case 'manager':
          return { manager: 'yarn' };
        case 'directory':
          return { directory: '.' };
        case 'gitInit':
          return { gitInit: true };
        case 'confirm':
          return { confirm: false };
        default:
          throw new Error(`Unexpected question: ${question.name}`);
      }
    };

    // Mock fs.existsSync
    fs.existsSync = (path) => false;
  });

  after(() => {
    // Reset mocks
    delete inquirer.prompt;
    delete fs.existsSync;
  });

  it('should ask user for type of migration', async () => {
    const result = await askUserForTypeOfMigration();
    assert.deepStrictEqual(result, { type: 'entities' });
  });

  it('should ask user for migration name', async () => {
    const result = await askUserForMigrationName();
    assert.deepStrictEqual(result, { filename: 'test-migration' });
  });

  it('should ask user which plugin to use', async () => {
    const availablePlugins = ['plugin1', 'plugin2'];
    const result = await askUserWhichPlugin(availablePlugins);
    assert.deepStrictEqual(result, { selectedPlugin: 'plugin1' });
  });

  it('should ask user for plugin name', async () => {
    const result = await askUserForPluginName();
    assert.deepStrictEqual(result, { name: 'test-plugin' });
  });

  it('should ask user for package manager', async () => {
    const result = await askUserForPackageManager();
    assert.deepStrictEqual(result, { manager: 'yarn' });
  });

  it('should ask user where to create app', async () => {
    const result = await askUserWhereToCreateApp();
    assert.deepStrictEqual(result, { directory: '.' });
  });

  it('should ask user to create git repo', async () => {
    const result = await askUserToCreateGitRepo();
    assert.deepStrictEqual(result, { gitInit: true });
  });

  it('should ask user to confirm downgrade migrations', async () => {
    const result = await askUserToConfirmDowngradeMigrations();
    assert.deepStrictEqual(result, { confirm: false });
  });
});