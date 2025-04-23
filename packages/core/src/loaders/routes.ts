import { AyazmoRouteOptions, PluginSettings, PluginRoutes } from '@ayazmo/types'
import { merge } from '@ayazmo/utils'
import { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import { validateRoute, isRouteEnabled, isWebSocketRoute } from '../utils/route-validator.js'

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
        return
      }

      let routes = routesModule.default

      if (typeof routesModule.default === 'function') {
        routes = routesModule.default(app)
      }

      routes.forEach((route: AyazmoRouteOptions & PluginRoutes) => {
        const validationResult = validateRoute(route)
        const routeEnabled = isRouteEnabled(route)
        const isWebSocket = isWebSocketRoute(route)

        if (!validationResult.isValid) {
          app.log.error(` - Invalid route detected in ${path}:`)
          validationResult.errors.forEach(error => {
            app.log.error(`   - ${error}`)
          })
          app.log.error(`   Route details: ${JSON.stringify(route, null, 2)}`)
          return
        }

        if (!routeEnabled) {
          app.log.debug(` - Skipping disabled route ${route.method} ${route.url}`)
          return
        }

        try {
          const routeHooks = routeConfig[route.url]?.hooks
          let hooksResult = {}
          if (typeof routeHooks === 'function') {
            hooksResult = routeHooks(app)
          }

          // extract custom route options, omitting the 'enabled' flag since it's only used for route validation
          const { enabled = true, ...routeOptions } = route // eslint-disable-line @typescript-eslint/no-unused-vars

          app.route(merge(routeOptions, hooksResult))
          
          // Log appropriately based on route type
          const hasHttpHandler = typeof route.handler === 'function';
          
          if (isWebSocket && hasHttpHandler) {
            // This route handles both HTTP and WebSocket protocols
            app.log.info(` - Registered dual-protocol route ${route.method} ${route.url} (HTTP + WebSocket)`)
          } else if (isWebSocket) {
            // WebSocket-only route
            if (route.wsHandler) {
              app.log.info(` - Registered WebSocket route with custom handler ${route.url}`)
            } else {
              app.log.info(` - Registered WebSocket route ${route.url}`)
            }
          } else {
            // HTTP-only route
            app.log.info(` - Registered route ${route.method} ${route.url}`)
          }
        } catch (error) {
          app.log.error(` - Failed to register route ${route.method} ${route.url}:`)
          app.log.error(`   ${error.message}`)
        }
      })
    })
}
