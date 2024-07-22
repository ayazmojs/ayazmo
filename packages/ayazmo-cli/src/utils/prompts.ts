import inquirer from 'inquirer'
import path from 'node:path'
import fs from 'node:fs'
import { isNonEmptyString } from '@ayazmo/utils'

export async function askUserForTypeOfMigration (): Promise<{ type: 'entities' | 'empty' }> {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What type of migration do you want to create?',
      choices: [
        {
          name: 'Create migration files from existing Entities',
          value: 'entities'
        },
        {
          name: 'Create an empty migration file',
          value: 'empty'
        }
      ]
    }
  ])
}

export async function askUserForMigrationName (): Promise<{ filename: string }> {
  return await inquirer.prompt([
    {
      type: 'input',
      name: 'filename',
      message: 'What should be the name of your migration file (optional)?',
      validate: (input: string) => {
        // Second validation check (example)
        function checkForSpecialCharacters (): boolean | string {
          // Custom logic to check for special characters
          const specialCharPattern = /[!@#$%^&*()+=[\]{};':"\\|,.<>/?]+/
          return !specialCharPattern.test(input) || 'Migration name should not contain special characters.'
        }

        const noSpecialCharResult = checkForSpecialCharacters()
        if (noSpecialCharResult !== true) {
          return noSpecialCharResult
        }

        return true
      }
    }
  ])
}

export async function askUserWhichPlugin (availablePlugins: string[]): Promise<{ selectedPlugin: string }> {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPlugin',
      message: 'Which plugin would you like to use?',
      choices: availablePlugins
    }
  ])
}

export async function askUserForPluginName (): Promise<{ name: string }> {
  return await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What should be the name of your plugin?',
      validate: (input: string) => {
        function checkForSpecialCharacters (input: string): boolean {
          // Custom logic to check for special characters
          const specialCharPattern = /[!@#$%^&*()+=[\]{};':"\\|,.<>/?]+/
          return !specialCharPattern.test(input)
        }

        const notEmptyResult = isNonEmptyString(input)
        if (!notEmptyResult) {
          return 'Please enter a valid plugin name.'
        }

        const noSpecialCharResult = checkForSpecialCharacters(input)
        if (!noSpecialCharResult) {
          return 'Plugin name should not contain special characters.'
        }

        const pluginsDir = path.join(process.cwd(), 'src', 'plugins', input)
        if (fs.existsSync(pluginsDir)) {
          return `A plugin with the name "${input}" already exists in ${pluginsDir}.`
        }

        const nodeModulesPluginsDirectory = path.join(process.cwd(), 'node_modules', input)
        if (fs.existsSync(nodeModulesPluginsDirectory)) {
          return `A plugin with the name "${input}" is already installed in ${nodeModulesPluginsDirectory}.`
        }

        return true
      }
    }
  ])
}

export async function askUserForPackageManager (): Promise<{ manager: 'yarn' | 'npm' }> {
  return await inquirer.prompt([
    {
      type: 'list',
      name: 'manager',
      message: 'Which package manager do you prefer?',
      choices: ['yarn', 'npm']
    }
  ])
}

export async function askUserWhereToCreateApp (): Promise<{ directory: string }> {
  return await inquirer.prompt([
    {
      type: 'input',
      name: 'directory',
      message: 'In which folder would you like to create the app? (default: current folder)',
      default: '.'
    }
  ])
}

export async function askUserToCreateGitRepo (): Promise<{ gitInit: boolean }> {
  return await inquirer.prompt([
    {
      type: 'confirm',
      name: 'gitInit',
      message: 'Do you want to initialize a new Git repository?',
      default: true
    }
  ])
}

// ask user to confirm downgrade of plugin migrations
export async function askUserToConfirmDowngradeMigrations (): Promise<{ confirm: boolean }> {
  return await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Do you want to downgrade the plugin migrations?',
      default: false
    }
  ])
}
