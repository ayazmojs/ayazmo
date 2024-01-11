#!/usr/bin/env node

import "dotenv/config.js";
import { program } from 'commander';
import kleur from 'kleur';
import { createApplication } from './utils/create-application.js';
import { createMigration } from './utils/create-migration.js';
import { createPlugin } from './utils/create-plugin.js';
import { getAyazmoVersion } from "./utils/ayazmo-cli-info.js";
import { runMigrations } from "./utils/run-migrations.js";
import { isAyazmoProject } from "./utils/is-ayazmo-project.js";

if (!isAyazmoProject(process.cwd())) {
  console.error({ text: kleur.red('This command must be run in the root of an Ayazmo project.') });
  process.exit(1);
}

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
  .action(createMigration);

  program
  .command('migration:up')
  .description('Run all migrations')
  .action(runMigrations);

program
  .command('plugin:create')
  .description('Create a new Ayazmo plugin')
  .action(createPlugin);

program
  .command('help')
  .description('List all command options')
  .action(() => {
    program.outputHelp();
  });


program.parse(process.argv);
