import path from 'node:path';
import { importGlobalConfig, listPlugins, initDatabase, PLUGINS_ROOT, Migrator } from '@ayazmo/utils'
import type { IBaseOrmConfig, ITypePrompt, INamePrompt, IPluginPrompt } from '@ayazmo/types';
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
} from './prompts.js';
import CliLogger from './cli-logger.js';

export async function createMigration() {
  let orm: any;
  let migrationPath: string;
  let availablePlugins: string[];
  let globalConfig: any;
  let selectPluginPrompt: IPluginPrompt = { selectedPlugin: '' };
  let migrationTypePrompt: ITypePrompt = { type: 'entities' };
  let migrationNamePrompt: INamePrompt = { filename: '' };
  const cwd = process.cwd();
  let ormConfig: IBaseOrmConfig = {
    entities: [`./dist/plugins/**/src/entities/*.js`],
    entitiesTs: [`./src/plugins/**/src/entities`],
    baseDir: cwd,
    migrations: {
      snapshot: false,
      path: '',
      emit: 'ts'
    },
  };

  try {

    await CliLogger.task('Checking environment...', async () => {
      globalConfig = await importGlobalConfig();
    });
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
    } else if (availablePlugins.length > 1) {
      selectPluginPrompt = await askUserWhichPlugin(availablePlugins);
      // check the plugin is enabled in the config
      if (!globalConfig.plugins.some((plugin) => plugin.name === selectPluginPrompt.selectedPlugin)) {
        throw new Error(`Plugin ${selectPluginPrompt.selectedPlugin} is not enabled in ayazmo.config.js`);
      }
      migrationPath = path.join(PLUGINS_ROOT, selectPluginPrompt.selectedPlugin, 'src', 'migrations');
    } else {
      throw new Error('No plugins available in this project.');
    }

    ormConfig.migrations.path = migrationPath;

    orm = await initDatabase({
      ...ormConfig,
      ...globalConfig.database,
    });

    if (!(await orm.isConnected())) {
      throw new Error('Failed to connect to the database. Please ensure your ayazmo.config.js file has the correct DB credentials.');
    }

    const migrator: Migrator = orm.getMigrator();
    const pendingMigrations = await migrator.getPendingMigrations();

    if (pendingMigrations && pendingMigrations.length > 0) {
      throw new Error('There are pending migrations. Please run them before creating a new one.');
    }

    const { fileName } = await migrator.createMigration(ormConfig.migrations.path, migrationTypePrompt.type === 'empty', false, migrationNamePrompt.filename);
    CliLogger.success(`Successfully created migration: ${fileName}`);

  } catch (error) {
    CliLogger.error(error);
  } finally {
    if (orm) {
      await orm.close(true);
    }
    process.exit(0);
  }
}