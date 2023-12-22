import fs from 'fs';
import path from 'path';
import { AyazmoInstance } from '@ayazmo/types';

export async function loadGraphQL(pluginsDir: string, app: AyazmoInstance) {
  const pluginDirs = fs.readdirSync(pluginsDir);

  for (const dir of pluginDirs) {
    const schemaPath = path.join(pluginsDir, dir, 'graphql/schema.js');
    const resolversPath = path.join(pluginsDir, dir, 'graphql/resolvers.js');

    try {
      if (fs.existsSync(schemaPath) && fs.existsSync(resolversPath)) {
        const pluginSchema = require(schemaPath);
        const pluginResolvers = require(resolversPath);


        app.register(async function (app) {
          app.graphql.extendSchema(pluginSchema)
          app.graphql.defineResolvers(pluginResolvers)
          // app.graphql.defineLoaders(loaders)
        })
      }
    } catch (error) {
      app.log.error(`Error loading GraphQL for plugin ${dir}: ${error.message}`);
    }
  }
}