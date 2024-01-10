import { initDatabase, importGlobalConfig, MikroORM } from '@ayazmo/utils';
import { discoverMigrationPaths, discoverMigrationFiles } from '@ayazmo/core';
// import { PluginPaths } from '@ayazmo/types'
import { createSpinner } from 'nanospinner';
import path from 'node:path';
import kleur from 'kleur';
import { isAyazmoProject } from './is-ayazmo-project.js';

export async function runMigrations() {
  let orm: MikroORM;
  const cwd = process.cwd();
  const spinner = createSpinner('Running migrations...').start();
  const configPath: string = path.join(cwd, 'ayazmo.config.js');

  if (!isAyazmoProject(cwd)) {
    spinner.error({ text: kleur.red('This command must be run in the root of an Ayazmo project.') });
    process.exit(1);
  }

  try {
    const globalConfig = await importGlobalConfig(configPath);
    const migrationPaths: string[] = discoverMigrationPaths(globalConfig.plugins);
    const migrationClasses: any[] = await discoverMigrationFiles(migrationPaths);

    if (migrationClasses.length === 0) {
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
          migrationsList: migrationClasses,
          disableForeignKeys: false,
        },
      },
      ...globalConfig.database
    });
    // const availablePlugins: string[] = listPlugins(path.join(cwd, 'src', 'plugins'));
    const migrator = orm.getMigrator();
    const executed = await migrator.up();
    console.log(executed)
  } catch (error) {
    spinner.error({ text: kleur.red('Error running migrations.'), mark: kleur.red("×") });
    console.error(error);
    process.exit(1);
  }

  spinner.success({ text: kleur.green('Migrations applied successfully!'), mark: kleur.green("√") })
  process.exit(0);
}