import { AyazmoRouteOptions, PluginSettings } from '@ayazmo/types'
import { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import { AwilixContainer } from 'awilix'
import { isValidRoute } from '../utils/route-validator.js'

export async function loadRoutes (
  app: FastifyInstance,
  container: AwilixContainer,
  path: string,
  pluginSettings: PluginSettings): Promise<void> {
  if (!fs.existsSync(path)) {
    app.log.info(` - Routes file not found in plugin directory: ${path}`)
    return
  }

  const routeConfig = pluginSettings?.routes ?? {}

  app
    .after(async () => {
      const routesModule = await import(path)

      // Check if the default export exists
      if (!routesModule.default) {
        app.log.error(` - The module ${path} does not have a valid default export. Skipping...`)
      } else {
        let routes = routesModule.default

        if (typeof routesModule.default === 'function') {
          routes = routesModule.default(app)
        }

        routes.forEach((route: AyazmoRouteOptions) => {
          if (isValidRoute(route)) {
            const routeHooks = routeConfig[route.url]?.hooks
            let hooksResult: any = {}
            if (typeof routeHooks === 'function') {
              hooksResult = routeHooks(app, container)
            }

            app.route({
              ...route,
              ...hooksResult
            })
            app.log.info(` - Registered route ${route.method} ${route.url}`)
          } else {
            app.log.error(` - Invalid route detected in ${path}`)
          }
        })
      }
    })
}
