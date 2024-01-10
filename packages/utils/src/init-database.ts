import { MikroORM, Options } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from '@mikro-orm/migrations';

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

  return rest;
}