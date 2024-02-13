#!/usr/bin/env node

import "dotenv/config.js";
import { program } from 'commander';
import { createApplication } from './utils/create-application.js';
import { createMigration } from './utils/create-migration.js';
import { createPlugin } from './utils/create-plugin.js';
import { getAyazmoVersion } from "./utils/ayazmo-cli-info.js";
import { runMigrations } from "./utils/run-migrations.js";
import { validateAyazmoProject } from "./utils/validate-ayazmo-project.js";

const version = getAyazmoVersion();

program
  .name("ayazmo-cli")
  .description("CLI to manage Ayazmo projects")
  .version(`Ayazmo CLI v${version}`);

program
  .command('app:create')
  .description('Create a new Ayazmo application')
  .action(createApplication);

program
  .command('migration:create')
  .description('Create a new migration file')
  .action(() => {
    validateAyazmoProject();
    createMigration()
  });

  program
  .command('migration:up')
  .description('Run all migrations')
  .action(() => {
    validateAyazmoProject();
    runMigrations()
  });

program
  .command('plugin:create')
  .description('Create a new Ayazmo plugin')
  .action(() => {
    validateAyazmoProject();
    createPlugin()
  });

program
  .command('help')
  .description('List all command options')
  .action(() => {
    program.outputHelp();
  });


program.parse(process.argv);