import assert from 'node:assert'
import { describe, it, after, before } from 'node:test'

import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin,
  askUserForPluginName,
  askUserForPackageManager,
  askUserWhereToCreateApp,
  askUserToCreateGitRepo,
  askUserToConfirmDowngradeMigrations
} from '../../dist/utils/prompts.js'

import inquirer from 'inquirer'
import fs from 'node:fs'

describe('Prompt functions', async () => {
  before(() => {
    // Mock inquirer.prompt
    inquirer.prompt = async (questions) => {
      // Handle both single question and array of questions
      if (!Array.isArray(questions)) {
        questions = [questions]
      }

      const responses = {}
      for (const question of questions) {
        switch (question.name) {
          case 'type':
            responses.type = 'entities'
            break
          case 'scope':
            responses.scope = 'selected'
            break
          case 'filename':
            responses.filename = 'test-migration'
            break
          case 'selectedPlugin':
            responses.selectedPlugin = 'plugin1'
            break
          case 'name':
            responses.name = 'test-plugin'
            break
          case 'manager':
            responses.manager = 'yarn'
            break
          case 'directory':
            responses.directory = '.'
            break
          case 'gitInit':
            responses.gitInit = true
            break
          case 'confirm':
            responses.confirm = false
            break
          default:
            throw new Error(`Unexpected question: ${question.name}`)
        }
      }
      return responses
    }

    // Mock fs.existsSync
    fs.existsSync = (path) => false
  })

  after(() => {
    // Reset mocks
    delete inquirer.prompt
    delete fs.existsSync
  })

  it('should ask user for type of migration', async () => {
    const result = await askUserForTypeOfMigration()
    assert.deepStrictEqual(result, {
      type: 'entities',
      scope: 'selected'
    })
  })

  it('should ask user for migration name', async () => {
    const result = await askUserForMigrationName()
    assert.deepStrictEqual(result, { filename: 'test-migration' })
  })

  it('should ask user which plugin to use', async () => {
    const availablePlugins = ['plugin1', 'plugin2']
    const result = await askUserWhichPlugin(availablePlugins)
    assert.deepStrictEqual(result, { selectedPlugin: 'plugin1' })
  })

  it('should ask user for plugin name', async () => {
    const result = await askUserForPluginName()
    assert.deepStrictEqual(result, { name: 'test-plugin' })
  })

  it('should ask user for package manager', async () => {
    const result = await askUserForPackageManager()
    assert.deepStrictEqual(result, { manager: 'yarn' })
  })

  it('should ask user where to create app', async () => {
    const result = await askUserWhereToCreateApp()
    assert.deepStrictEqual(result, { directory: '.' })
  })

  it('should ask user to create git repo', async () => {
    const result = await askUserToCreateGitRepo()
    assert.deepStrictEqual(result, { gitInit: true })
  })

  it('should ask user to confirm downgrade migrations', async () => {
    const result = await askUserToConfirmDowngradeMigrations()
    assert.deepStrictEqual(result, { confirm: false })
  })
})
