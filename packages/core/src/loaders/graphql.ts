import fs from 'node:fs'
import path from 'node:path'
import { AyazmoInstance } from '@ayazmo/types'
import { isDefaultExport } from '@ayazmo/utils'

export async function loadGraphQL (fastify: AyazmoInstance, GqlPath: string): Promise<void> {
  if (!fs.existsSync(GqlPath)) {
    fastify.log.info(` - graphql folder not found in plugin directory: ${GqlPath}`)
    return
  }

  const schemaPath = path.join(GqlPath, 'schema.js')
  const resolversPath = path.join(GqlPath, 'resolvers.js')

  try {
    if (fs.existsSync(schemaPath) && fs.existsSync(resolversPath)) {
      const pluginSchema = await import(schemaPath)
      const pluginResolvers = await import(resolversPath)

      if (!isDefaultExport(pluginSchema)) {
        fastify.log.error(` - The module ${schemaPath} does not have a valid default export.`)
        return
      }

      if (!isDefaultExport(pluginResolvers)) {
        fastify.log.error(` - The module ${pluginResolvers} does not have a valid default export.`)
        return
      }

      fastify.register(async function (app) {
        app.graphql.extendSchema(pluginSchema.default)
        app.graphql.defineResolvers(pluginResolvers.default)
        // app.graphql.defineLoaders(loaders)
      })
    }
  } catch (error) {
    fastify.log.error(` - Error loading GraphQL: ${error.message}`)
  }
}
