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

const version = getAyazmoVersion()
printAyazmo()

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
  .action(async () => {
    validateAyazmoProject()
    await runMigrations()
  })

program
  .command('plugin:create')
  .description('Create a new Ayazmo plugin')
  .action(createPlugin)

program.parse(process.argv)
