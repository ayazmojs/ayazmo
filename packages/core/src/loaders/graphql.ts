import fs from 'fs';
import path from 'path';
import { AyazmoInstance } from '@ayazmo/types';

export async function loadGraphQL(fastify: AyazmoInstance, GqlPath: string): Promise<void> {
  if (!fs.existsSync(GqlPath)) {
    fastify.log.info(` - graphql folder not found in plugin directory: ${GqlPath}`);
    return;
  }

  const schemaPath = path.join(GqlPath, 'schema.js');
  const resolversPath = path.join(GqlPath, 'resolvers.js');

  try {
    if (fs.existsSync(schemaPath) && fs.existsSync(resolversPath)) {
      const pluginSchema = require(schemaPath);
      const pluginResolvers = require(resolversPath);


      fastify.register(async function (app) {
        app.graphql.extendSchema(pluginSchema)
        app.graphql.defineResolvers(pluginResolvers)
        // app.graphql.defineLoaders(loaders)
      })
    }
  } catch (error) {
    fastify.log.error(` - Error loading GraphQL: ${error.message}`);
  }
}