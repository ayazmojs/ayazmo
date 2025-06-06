#!/usr/bin/env node

import 'dotenv/config.js'
import { program } from 'commander'
import { createApplication } from './utils/create-application.js'
import { createMigration } from './utils/create-migration.js'
import { createPlugin } from './utils/create-plugin.js'
import { getAyazmoVersion } from './utils/ayazmo-cli-info.js'
import { runMigrations } from './utils/run-migrations.js'
import { validateAyazmoProject } from './utils/validate-ayazmo-project.js'
import printAyazmo from './utils/print-ayazmo.js'
import { installPlugin } from './utils/install-plugin.js'
import { removePlugin } from './utils/remove-plugin.js'
import { downMigrations } from './utils/down-migrations.js'
import { validateConfig, generateTemplate } from './utils/config-validation.js'
import CliLogger from './utils/cli-logger.js'

const version = getAyazmoVersion()

if (process.env.NODE_ENV === undefined || process.env.NODE_ENV === '' || process.env.NODE_ENV === 'development') {
  printAyazmo()
}

program
  .name('ayazmo')
  .description('CLI to manage Ayazmo projects')
  .version(`Ayazmo CLI v${version}`)

program
  .command('app:create')
  .description('Create a new Ayazmo application')
  .action(createApplication)

program
  .command('migration:create')
  .description('Create a new migration file')
  .action(async () => {
    validateAyazmoProject()
    await createMigration()
  })

program
  .command('migration:up')
  .description('Run all migrations')
  .option('-i, --interactive', 'Run in interactive mode')
  .option('-p, --plugin <plugin-name>', 'Run migrations for a specific plugin')
  .action(async (options) => {
    validateAyazmoProject()
    try {
      const result = await runMigrations({
        interactive: options.interactive ?? false,
        plugin: options.plugin
      })

      if (!result.success) {
        CliLogger.error('Migration failed')
        process.exit(3) // Migration execution error
      }

      process.exit(0)
    } catch (error) {
      CliLogger.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

program
  .command('migration:down')
  .description('Remove migrations')
  .option('--to <target>', 'Target migration to revert to, can be an integer or a name of the migration')
  .action(async (options) => {
    validateAyazmoProject()
    await downMigrations(options)
  })

program
  .command('plugin:create')
  .description('Create a new Ayazmo plugin')
  .action(createPlugin)

program
  .command('install')
  .description('Install a plugin')
  .argument('<plugin-name>', 'The name of the plugin to install')
  .action(installPlugin)

program
  .command('add')
  .description('Install a plugin')
  .argument('<plugin-name>', 'The name of the plugin to install')
  .action(installPlugin)

program
  .command('plugin:install')
  .description('Install a plugin')
  .argument('<plugin-name>', 'The name of the plugin to install')
  .action(installPlugin)

program
  .command('remove')
  .description('Removes a plugin')
  .argument('<plugin-name>', 'The name of the plugin to remove')
  .action(removePlugin)

// Add new command for config validation
program
  .command('config:validate')
  .description('Validate environment variables against your app configuration')
  .option('-t, --template', 'Generate a template .env file')
  .option('-o, --output <path>', 'Output path for the template file (default: .env.example)')
  .action(async (options) => {
    validateAyazmoProject()
    await validateConfig(options)
  })

// Add new command for generating environment variable templates
program
  .command('config:template')
  .description('Generate a template .env file based on your app configuration')
  .option('-o, --output <path>', 'Output path for the template file (default: .env.example)')
  .action(async (options) => {
    validateAyazmoProject()
    await generateTemplate(options)
  })

program.parse(process.argv)
