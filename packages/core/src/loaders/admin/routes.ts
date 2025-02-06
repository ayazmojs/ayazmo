import { AyazmoRouteOptions, PluginSettings, PluginRoutes, AppConfig, AyazmoInstance } from '@ayazmo/types'
import { merge } from '@ayazmo/utils'
import { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import { validateAdminRoute, isRouteEnabled, isValidAdminRouteOverride, parsePreHandler } from '../../utils/route-validator.js'

export async function loadAdminRoutes (
  app: FastifyInstance,
  path: string,
  pluginSettings: PluginSettings): Promise<void> {
  const config: AppConfig = app.diContainer.resolve('config')
  const { admin } = config

  if (!admin?.enabled) {
    app.log.info(' - Admin routes plugin is disabled via config')
    return
  }

  if (!app.hasDecorator('adminAuthChain')) {
    app.log.debug(' - Admin routes plugin requires adminAuthChain decorator to be enabled')
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

  let routesOverrideConfig: PluginRoutes[] = []

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
        const validationResult = validateAdminRoute(tmpRoute)
        const routeEnabled = isRouteEnabled(tmpRoute)

        if (!validationResult.isValid) {
          app.log.error(` - Invalid admin route detected in ${path}:`)
          validationResult.errors.forEach(error => {
            app.log.error(`   - ${error}`)
          })
          app.log.error(`   Route details: ${JSON.stringify(tmpRoute, null, 2)}`)
          return
        }

        if (!routeEnabled) {
          app.log.debug(` - Skipping disabled admin route ${tmpRoute.method} ${tmpRoute.url}`)
          return
        }

        try {
          // Check for route override
          const overrideRoute = routesOverrideConfig.find(
            (r: any) => r.url === tmpRoute.url && r.method === tmpRoute.method
          )

          if ((overrideRoute != null) && isValidAdminRouteOverride(overrideRoute)) {
            // Merge the original route with the override from config
            merge(tmpRoute, overrideRoute)
            tmpRoute = parsePreHandler(app, tmpRoute)
            app.log.debug(` - Applied route override for ${tmpRoute.method} ${tmpRoute.url}`)
          }

          // extract custom route options
          const { url, ...routeOptions } = tmpRoute
          const finalUrl = `${admin.opts.prefix}${url}`

          app.route({
            ...routeOptions,
            url: finalUrl
          })
          app.log.info(` - Registered admin route ${routeOptions.method} ${finalUrl}`)
        } catch (error) {
          app.log.error(` - Failed to register admin route ${tmpRoute.method} ${tmpRoute.url}:`)
          app.log.error(`   ${error.message}`)
        }
      })
    })
}
