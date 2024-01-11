
import { Options } from "@mikro-orm/core";
export interface PluginConfig {
  name: string;
  settings: any;
}

export interface AppConfig {
  plugins: PluginConfig[];
  database: Options;
}

export interface PluginPaths {
  services: string;
  graphql: string;
  entities: string;
  routes: string;
  migrations: string;
}
