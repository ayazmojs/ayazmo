import path from 'node:path';
import kleur from 'kleur';
import { createSpinner } from 'nanospinner';
import { Migrator } from '@mikro-orm/migrations';
import { importGlobalConfig, listPlugins, initDatabase, PLUGINS_ROOT } from '@ayazmo/utils'
import type { IBaseOrmConfig, IPluginPrompt, ITypePrompt, INamePrompt } from '@ayazmo/types';
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
} from './prompts.js';

export async function createMigration() {
  let orm: any;
  let migrationPath: string;
  let availablePlugins: string[];
  let selectPluginPrompt: IPluginPrompt = { selectedPlugin: '' };
  let migrationTypePrompt: ITypePrompt = { type: 'entities' };
  let migrationNamePrompt: INamePrompt = { filename: '' };
  const spinner = createSpinner('Checking environment...').start();
  const cwd = process.cwd();
  let ormConfig: IBaseOrmConfig = {
    entities: [],
    entitiesTs: [],
    baseDir: cwd,
    migrations: {
      snapshot: false,
      path: '',
      emit: 'ts',
    },
  };

  const globalConfig = await importGlobalConfig();

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

    availablePlugins = listPlugins(PLUGINS_ROOT);

    if (availablePlugins.length === 1) {

      migrationPath = path.join(PLUGINS_ROOT, availablePlugins[0], 'src', 'migrations');

      if (migrationTypePrompt.type !== 'empty') {
        ormConfig.entities = [`./dist/plugins/${availablePlugins[0]}/src/entities/*.js`];
        ormConfig.entitiesTs = [`./src/plugins/${availablePlugins[0]}/src/entities/*.ts`];
      }

    } else if (availablePlugins.length > 1) {

      spinner.stop();
      selectPluginPrompt = await askUserWhichPlugin(availablePlugins);
      // check the plugin is enabled in the config
      if (!globalConfig.plugins.some((plugin) => plugin.name === selectPluginPrompt.selectedPlugin)) {
        spinner.error({ text: kleur.red(`Plugin ${selectPluginPrompt.selectedPlugin} is not enabled in ayazmo.config.js`) });
        process.exit(1);
      }
      migrationPath = path.join(PLUGINS_ROOT, selectPluginPrompt.selectedPlugin, 'src', 'migrations');

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