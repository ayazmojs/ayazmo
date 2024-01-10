import path from 'node:path';
import kleur from 'kleur';
import { createSpinner } from 'nanospinner';
import { Migrator } from '@mikro-orm/migrations';
import { isAyazmoProject } from './is-ayazmo-project.js';
import { importGlobalConfig, listPlugins, initDatabase } from '@ayazmo/utils'
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
}
  from './prompts.js';

export async function createMigration() {
  let orm: any;
  let migrationPath: string;
  let availablePlugins: string[];
  let selectPluginPrompt: any;
  let migrationTypePrompt: any = { type: 'entities' };
  let migrationNamePrompt: any = { filename: '' };
  const spinner = createSpinner('Checking environment...').start();
  const cwd = process.cwd();
  let ormConfig: any = {
    entities: [],
    entitiesTs: [],
    baseDir: cwd,
    migrations: {
      snapshot: false,
      path: '',
      emit: 'ts',
    },
  };

  if (!isAyazmoProject(cwd)) {
    spinner.error({ text: kleur.red('This command must be run in the root of an Ayazmo project.') });
    process.exit(1);
  }

  const configPath: string = path.join(cwd, 'ayazmo.config.js');
  const globalConfig = await importGlobalConfig(configPath);

  try {
    spinner.stop();
    migrationTypePrompt = await askUserForTypeOfMigration();

    if (migrationTypePrompt.type === 'empty') {
      ormConfig.discovery = {
        warnWhenNoEntities: false,
        requireEntitiesArray: false,
        disableDynamicFileAccess: false,
      }

      migrationNamePrompt = await askUserForMigrationName();
    }

    availablePlugins = listPlugins(path.join(cwd, 'src', 'plugins'));

    if (availablePlugins.length === 1) {
      migrationPath = path.join(cwd, 'src', 'plugins', availablePlugins[0], 'src', 'migrations');

      if (migrationTypePrompt.type !== 'empty') {
        ormConfig.entities = [`./dist/plugins/${availablePlugins[0]}/src/entities/*.js`];
        ormConfig.entitiesTs = [`./src/plugins/${availablePlugins[0]}/src/entities/*.ts`];
      }
    } else if (availablePlugins.length > 1) {
      spinner.stop();
      selectPluginPrompt = await askUserWhichPlugin(availablePlugins);
      migrationPath = path.join(cwd, 'src', 'plugins', selectPluginPrompt.selectedPlugin, 'src', 'migrations');

      if (migrationTypePrompt.type !== 'empty') {
        ormConfig.entities = [`./dist/plugins/${selectPluginPrompt.selectedPlugin}/src/entities/*.js`];
        ormConfig.entitiesTs = [`./src/plugins/${selectPluginPrompt.selectedPlugin}/src/entities/*.ts`];
      }
    } else {
      spinner.error({ text: kleur.red('No plugins available in this project.'), mark: kleur.red("×") });
      process.exit(1);
    }

    ormConfig.migrations.path = migrationPath;

    orm = await initDatabase({
      ...ormConfig,
      ...globalConfig.database,
    });

    if (!(await orm.isConnected())) {
      spinner.error({ text: kleur.red('Failed to connect to the database. Please ensure your ayazmo.config.js file has the correct DB credentials.'), mark: kleur.red("×") });
      process.exit(1);
    }

    const migrator: Migrator = orm.getMigrator();
    const pendingMigrations = await migrator.getPendingMigrations();

    if (pendingMigrations && pendingMigrations.length > 0) {
      console.log(pendingMigrations)
      spinner.warn({ text: kleur.yellow('There are pending migrations. Please run them before creating a new one.'), mark: kleur.red("×") });
      orm.close(true);
      process.exit(1);
    }

    const { fileName } = await migrator.createMigration(migrationPath, migrationTypePrompt.type === 'empty', false, migrationNamePrompt.filename);
    spinner.success({ text: kleur.green(`Successfully created migration: ${fileName}`), mark: kleur.green("√") });
  } catch (error) {
    spinner.error({ text: kleur.red(error), mark: kleur.red("×") });
    process.exit(1);
  } finally {
    if (orm) {
      await orm.close(true);
    }
    process.exit(0);
  }
}