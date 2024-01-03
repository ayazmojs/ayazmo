#!/usr/bin/env node

import "dotenv/config.js";
import { program } from 'commander';
import { createApplication } from './utils/create-application.js';
import { createMigration } from './utils/create-migration.js';
import { createPlugin } from './utils/create-plugin.js';

program
  .name("ayazmo-cli")
  .description("CLI to manage Ayazmo projects")
  .version("0.1.0");

program
  .command('create')
  .description('Create a new Ayazmo application')
  .action(createApplication);

program
  .command('migration:create')
  .description('Create a new migration file')
  .action(createMigration);

program
  .command('plugin:create')
  .description('Create a new Ayazmo plugin')
  .action(createPlugin);

program.parse(process.argv);
