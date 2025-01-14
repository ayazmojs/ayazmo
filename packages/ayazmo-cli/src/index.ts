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
    await runMigrations({
      interactive: options.interactive ?? false,
      plugin: options.plugin
    })
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

program.parse(process.argv)
