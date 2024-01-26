import { MikroORM, Options, PostgreSqlDriver, Migrator } from "@ayazmo/types";
import AyazmoMigrationGenerator from "./migration-generator.js";

export default async function initDatabase(config: Options): Promise<MikroORM> {
  // Perform necessary validation and checks on the config object

  // Initialize MikroORM database
  const orm = await MikroORM.init(prepareConfig(config));

  // Return the initialized MikroORM instance
  return orm;
}

function prepareConfig(config: any): Options {
  // Perform necessary validation and checks on the config object

  const {type, ...rest} = config;

  // Return the prepared config object
  if (type === 'postgresql') {
    rest.driver = PostgreSqlDriver;
  }

  rest.extensions = [Migrator];
  rest.migrations.generator = AyazmoMigrationGenerator;

  return rest;
}