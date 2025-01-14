import { AyazmoRouteOptions, PluginSettings, PluginRoutes } from '@ayazmo/types'
import { merge } from '@ayazmo/utils'
import { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import { isValidRoute, isRouteEnabled } from '../utils/route-validator.js'

export async function loadRoutes (
  app: FastifyInstance,
  path: string,
  pluginSettings: PluginSettings): Promise<void> {
  if (!fs.existsSync(path)) {
    app.log.info(` - Routes file not found in plugin directory: ${path}`)
    return
  }

  const routeConfig = pluginSettings?.routes ?? {}
  const pluginRoutesEnabled = routeConfig?.enabled ?? true

  if (!pluginRoutesEnabled) {
    app.log.info(' - Routes plugin is disabled')
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
              hooksResult = routeHooks(app)
            }

            // extract custom route options, omitting the 'enabled' flag since it's only used for route validation
            const { enabled = true, ...routeOptions } = route

            app.route(merge(
              routeOptions,
              hooksResult
            ))
            app.log.info(` - Registered route ${route.method} ${route.url} ${enabled ? '' : '(disabled)'}`)
          } else {
            app.log.error(` - Invalid route detected in ${path}`)
          }
        })
      }
    })
}
