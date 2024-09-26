import { AyazmoRouteOptions, PluginSettings, PluginRoutes, AppConfig, AyazmoInstance } from '@ayazmo/types'
import { merge } from '@ayazmo/utils'
import { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import { isValidAdminRoute, isRouteEnabled, isValidAdminRouteOverride, parsePreHandler } from '../../utils/route-validator.js'

export async function loadAdminRoutes(
  app: FastifyInstance,
  path: string,
  pluginSettings: PluginSettings): Promise<void> {
  const config = app.diContainer.resolve('config') as AppConfig
  const { admin } = config

  if (!admin?.enabled) {
    app.log.info(` - Admin routes plugin is disabled via config`)
    return
  }

  if (!app.hasDecorator('adminAuthChain')) {
    app.log.debug(` - Admin routes plugin requires adminAuthChain decorator to be enabled`)
    return
  }

  if (!fs.existsSync(path)) {
    app.log.info(` - Admin routes file not found in plugin directory: ${path}`)
    return
  }

  const routesModule = await import(path)

  if (!routesModule.default) {
    app.log.error(` - The module ${path} does not have a valid default export. Skipping...`)
    return
  }

  let routes = []

  if (typeof routesModule.default === 'function') {
    routes = routesModule.default(app)
  } else {
    routes = routesModule.default
  }

  let routesOverrideConfig: PluginRoutes[] = [];

  if (typeof pluginSettings?.admin?.routes === 'function') {
    routesOverrideConfig = (pluginSettings.admin.routes as (app: AyazmoInstance) => PluginRoutes[])(app as AyazmoInstance)
  }

  if (Array.isArray(pluginSettings?.admin?.routes)) {
    routesOverrideConfig = pluginSettings?.admin?.routes
  }

  app
    .after(async () => {
      routes.forEach((route: AyazmoRouteOptions & PluginRoutes) => {
        let tmpRoute = { ...route }
        if (!isValidAdminRoute(tmpRoute)) {
          app.log.debug(` - Invalid admin route detected in ${route.url} ${route.method}`)
          return
        }

        if (!isRouteEnabled(tmpRoute)) {
          app.log.debug(` - Admin route ${route.url} ${route.method} is disabled`)
          return
        }

        // Check for route override
        const overrideRoute = routesOverrideConfig.find(
          (r: any) => r.url === tmpRoute.url && r.method === tmpRoute.method
        )

        if (overrideRoute && isValidAdminRouteOverride(overrideRoute)) {
          // Merge the original route with the override from config
          merge(tmpRoute, overrideRoute)
          tmpRoute = parsePreHandler(app, tmpRoute)
        }

        // extract custom route options
        const { enabled, ...routeOptions } = tmpRoute

        app.route({
          ...routeOptions,
          url: `${admin.opts.prefix}${tmpRoute.url}`
        })
        app.log.info(` - Registered admin route ${tmpRoute.method} ${tmpRoute.url}`)
      })
    })
}
