import path from 'node:path'
import { importGlobalConfig, initDatabase, loadEnvironmentVariables, createAyazmoFolders, cleanupAyazmoFolder } from '@ayazmo/utils'
import {
  MikroORM,
  MikroORMOptions,
} from '@ayazmo/types'
import { BaseSchemaEntity } from '@ayazmo/core'
import {
  askUserForTypeOfMigration,
  askUserForMigrationName,
  askUserWhichPlugin
} from './prompts.js'
import CliLogger from './cli-logger.js'
import { getEntityFiles, importEntityFiles } from './migration-helpers.js'
import fs from 'fs-extra'

interface IPluginEntityPaths {
  pluginName: string;
  entityPath: string;
  isPrivate: boolean;
  sourcePath: string;
}

interface IMigrationContext {
  pluginPaths: IPluginEntityPaths[];
  selectedPlugin?: string;
  migrationTypePrompt?: ITypePrompt;
  migrationNamePrompt?: INamePrompt;
}

interface ITypePrompt {
  type: 'entities' | 'empty';
  scope?: 'selected' | 'all';
}

interface INamePrompt {
  filename: string;
}

async function validatePluginConfiguration(globalConfig: any): Promise<void> {
  if (!globalConfig?.plugins?.length) {
    throw new Error('No plugins configured in ayazmo.config.js');
  }
}

async function discoverPluginPaths(globalConfig: any): Promise<IPluginEntityPaths[]> {
  const cwd = process.cwd();
  const pluginPaths: IPluginEntityPaths[] = [];

  for (const plugin of globalConfig.plugins) {
    const isPrivate = plugin.settings?.private !== false;
    
    const entityPath = isPrivate 
      ? path.join(cwd, 'dist', 'plugins', plugin.name, 'entities')
      : path.join(cwd, 'node_modules', plugin.name, 'dist', 'entities');
    
    const sourcePath = isPrivate
      ? path.join(cwd, 'src', 'plugins', plugin.name, 'src', 'migrations')
      : path.join(cwd, 'node_modules', plugin.name, 'src', 'migrations');

    if (await fs.pathExists(entityPath)) {
      pluginPaths.push({
        pluginName: plugin.name,
        entityPath,
        isPrivate,
        sourcePath
      });
    }
  }

  return pluginPaths;
}

async function copyEntityFiles(context: IMigrationContext): Promise<void> {
  const ayazmoRoot = path.join(process.cwd(), '.ayazmo');
  
  for (const plugin of context.pluginPaths) {
    const targetPluginPath = path.join(ayazmoRoot, plugin.pluginName);
    const entityFiles = await getEntityFiles(plugin.entityPath);

    // Ensure directory exists once per plugin
    await fs.ensureDir(targetPluginPath);

    for (const file of entityFiles) {
      const targetPath = path.join(targetPluginPath, path.basename(file));
      await fs.copy(file, targetPath);
      CliLogger.info(`Copied entity: ${path.basename(file)} to ${plugin.pluginName}`);
    }
  }
}

export async function createMigration(): Promise<void> {
  let orm: MikroORM | null = null;
  const context: IMigrationContext = {
    pluginPaths: []
  };

  try {
    // Initialize
    loadEnvironmentVariables();
    await cleanupAyazmoFolder();
    
    // Load and validate configuration
    const globalConfig = await importGlobalConfig();
    await validatePluginConfiguration(globalConfig);
    
    // Discover plugin paths
    context.pluginPaths = await discoverPluginPaths(globalConfig);
    if (!context.pluginPaths.length) {
      throw new Error('No valid plugin entity paths found');
    }

    // Get migration type using existing prompt
    context.migrationTypePrompt = await askUserForTypeOfMigration();

    // Initialize ORM configuration
    const ormConfig: Partial<MikroORMOptions> = {
      entities: [BaseSchemaEntity],
      baseDir: process.cwd(),
      migrations: {
        snapshot: false,
        path: '',
        emit: 'ts'
      }
    };

    // Handle empty migration type
    if (context.migrationTypePrompt.type === 'empty') {
      ormConfig.discovery = {
        warnWhenNoEntities: false,
        requireEntitiesArray: false,
        disableDynamicFileAccess: false
      };
      context.migrationNamePrompt = await askUserForMigrationName();
    }

    // Get plugin selection using existing prompt
    const pluginNames = context.pluginPaths.map(p => p.pluginName);
    const selection = await askUserWhichPlugin(pluginNames);
    context.selectedPlugin = selection.selectedPlugin;

    // Validate selection
    const selectedPluginPath = context.pluginPaths.find(
      p => p.pluginName === context.selectedPlugin
    );
    if (!selectedPluginPath) {
      throw new Error(`Selected plugin ${context.selectedPlugin} not found`);
    }

    // Set migration path
    if (ormConfig.migrations) {
      ormConfig.migrations.path = selectedPluginPath.sourcePath;
    }

    // Handle entity-based migration
    if (context.migrationTypePrompt.type === 'entities') {
      await createAyazmoFolders();
      await copyEntityFiles(context);

      // Import entities from all plugins in .ayazmo
      const ayazmoRoot = path.join(process.cwd(), '.ayazmo');
      
      // Collect entities from all plugins
      for (const plugin of context.pluginPaths) {
        const pluginPath = path.join(ayazmoRoot, plugin.pluginName);
        const entityFiles = await getEntityFiles(pluginPath);
        
        if (entityFiles.length > 0) {
          const importedEntities = await importEntityFiles(entityFiles);
          if (ormConfig.entities) {
            ormConfig.entities.push(...importedEntities);
          }
        }
      }
    }

    // Initialize database connection
    orm = await initDatabase({
      ...ormConfig,
      ...globalConfig.database
    });

    if (!orm || !(await orm.isConnected())) {
      throw new Error('Failed to connect to the database. Please check your database configuration in ayazmo.config.js');
    }

    // Check for pending migrations
    const migrator = orm.getMigrator();
    const pendingMigrations = await migrator.getPendingMigrations();

    if (pendingMigrations.length > 0) {
      CliLogger.warn('The following migrations are pending:');
      pendingMigrations.forEach(migration => {
        CliLogger.warn(`- ${migration.name} (${selectedPluginPath.sourcePath})`);
      });
      throw new Error('Please run pending migrations before creating a new one');
    }

    // Create migration
    const { fileName } = await migrator.createMigration(
      selectedPluginPath.sourcePath,
      context.migrationTypePrompt.type === 'empty',
      false,
      context.migrationNamePrompt?.filename || ''
    );

    if (fileName?.trim()) {
      CliLogger.success(
        `Successfully created ${context.migrationTypePrompt.type} migration: ${path.join(selectedPluginPath.sourcePath, fileName)}`
      );
    } else {
      if (context.migrationTypePrompt.type === 'entities') {
        CliLogger.error(`No changes detected for plugin: ${context.selectedPlugin}`);
      } else {
        CliLogger.error('Failed to create empty migration');
      }
    }

  } catch (error) {
    CliLogger.error((error as Error).message);
  } finally {
    if (orm) {
      await orm.close(true);
    }
    await cleanupAyazmoFolder();
  }
}
