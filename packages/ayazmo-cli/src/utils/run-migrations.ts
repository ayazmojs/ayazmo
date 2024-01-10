import { initDatabase, importGlobalConfig } from '@ayazmo/utils';
import { discoverPrivateMigrationPaths, discoverMigrationFiles, discoverPublicMigrationPaths } from '@ayazmo/core';
import { Migrator } from '@mikro-orm/migrations';
import { createSpinner } from 'nanospinner';
import path from 'node:path';
import kleur from 'kleur';

export async function runMigrations() {
  let orm: any;
  const cwd = process.cwd();
  const spinner = createSpinner('Running migrations...').start();
  const configPath: string = path.join(cwd, 'ayazmo.config.js');

  try {
    const globalConfig = await importGlobalConfig(configPath);
    const privateMigrationPaths: string[] = discoverPrivateMigrationPaths(globalConfig.plugins);
    const publicMigrationPaths: string[] = discoverPublicMigrationPaths(globalConfig.plugins);
    const privateMigrationClasses: any[] = await discoverMigrationFiles([...privateMigrationPaths, ...publicMigrationPaths]);

    if (privateMigrationClasses.length === 0) {
      spinner.error({ text: kleur.red('No migrations found.'), mark: kleur.red("×") });
      process.exit(1);
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
    await migrator.up();
    spinner.success({ text: kleur.green('Migrations applied successfully!'), mark: kleur.green("√") })
  } catch (error) {
    spinner.error({ text: kleur.red(error), mark: kleur.red("×") });
    process.exit(1);
  } finally {
    if (orm) await orm.close();
    process.exit(0);
  }
}