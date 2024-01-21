import { initDatabase, importGlobalConfig, Migrator, MigrationObject } from '@ayazmo/utils';
import { discoverPrivateMigrationPaths, discoverMigrationFiles, discoverPublicMigrationPaths } from '@ayazmo/core';
import CliLogger from './cli-logger.js';

export async function runMigrations() {
  let orm: any;
  CliLogger.info('Checking environment...');

  try {

    const globalConfig = await importGlobalConfig();
    const privateMigrationPaths: string[] = discoverPrivateMigrationPaths(globalConfig.plugins);
    const publicMigrationPaths: string[] = discoverPublicMigrationPaths(globalConfig.plugins);
    const privateMigrationClasses: MigrationObject[] = await discoverMigrationFiles([...privateMigrationPaths, ...publicMigrationPaths]);

    if (privateMigrationClasses.length === 0) {
      throw new Error('No migrations found. Did you build your application?');
    }

    orm = await initDatabase({
      ... {
        entities: ['./dist/plugins/**/src/entities/*.js'],
        entitiesTs: ['./src/plugins/**/src/entities/*.ts'],
        baseDir: process.cwd(),
        migrations: {
          snapshot: false,
          migrationsList: privateMigrationClasses,
          disableForeignKeys: false,
        },
      },
      ...globalConfig.database
    });

    const migrator: Migrator = orm.getMigrator();
    const pendingMigrations = await migrator.getPendingMigrations();

    if (!pendingMigrations || pendingMigrations.length === 0) {
      throw new Error('There are no pending migrations. Please create a migration first.');
    }

    await migrator.up();
    CliLogger.success('Migrations applied successfully!');

  } catch (error) {

    CliLogger.error(error);

  } finally {

    if (orm) await orm.close();
    process.exit(0);

  }
}