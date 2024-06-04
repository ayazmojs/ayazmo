import { AyazmoRouteOptions, PluginSettings, PluginRoutes, AyazmoContainer } from '@ayazmo/types'
import { FastifyInstance } from 'fastify'
import fs from 'node:fs'
// import { AwilixContainer } from 'awilix'
import { isValidRoute, isRouteEnabled } from '../utils/route-validator.js'

export async function loadRoutes(
  app: FastifyInstance,
  container: AyazmoContainer,
  path: string,
  pluginSettings: PluginSettings): Promise<void> {
  if (!fs.existsSync(path)) {
    app.log.info(` - Routes file not found in plugin directory: ${path}`)
    return
  }

  const routeConfig = pluginSettings?.routes ?? {}
  const pluginRoutesEnabled = routeConfig?.enabled ?? true

  if (!pluginRoutesEnabled) {
    app.log.info(` - Routes plugin is disabled`)
    return
  }

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

        routes.forEach((route: AyazmoRouteOptions & PluginRoutes) => {
          if (isValidRoute(route) && isRouteEnabled(route)) {
            const routeHooks = routeConfig[route.url]?.hooks
            let hooksResult: any = {}
            if (typeof routeHooks === 'function') {
              hooksResult = routeHooks(app, container)
            }

            // extract custom route options
            const { enabled, ...routeOptions } = route

            app.route({
              ...routeOptions,
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
