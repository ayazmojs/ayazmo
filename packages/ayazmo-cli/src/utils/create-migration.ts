import { MikroORM } from '@mikro-orm/core';
import path from 'node:path';
import fs from 'node:fs';

export async function createMigration() {
  const cwd = process.cwd();

  // Check for ayazmo.config.js in the current working directory
  const configPath = path.join(cwd, '.env');

  if (!fs.existsSync(configPath)) {
    console.error('.env not found. Please run this command from the root of your plugin and ensure you have a .env file with DB credentials.');
    return;
  }

  // Initialize MikroORM
  const orm = await MikroORM.init({
    discovery: {
      warnWhenNoEntities: false
    },
    entities: [],
    entitiesTs: [],
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    debug: false,
    type: 'postgresql',
  });

  if (!orm.isConnected()) {
    console.error('Failed to connect to the database. Please ensure your .env file has the correct DB credentials.');
    return;
  }

  // Use MikroORM's Migrator to create a new migration
  const migrator = orm.getMigrator();
  const pendingMigrations = await migrator.getPendingMigrations();

  if (pendingMigrations && pendingMigrations.length > 0) {
    console.log("There are pending migrations. Please run them before creating a new one.");
    return;
  }

  try {
    const { fileName } = await migrator.createMigration(); // You can also pass a path and pattern here
    console.log(`Migration created: ${fileName}`);
  } catch (error) {
    console.error('Failed to create migration:', error.message);
  } finally {
    await orm.close(true);
  }
}
