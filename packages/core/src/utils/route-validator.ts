import { AyazmoInstance, AyazmoRouteOptions, PluginRoutes } from '@ayazmo/types'

export function isValidRoute (route: AyazmoRouteOptions): boolean {
  return 'method' in route && 'url' in route && typeof route.handler === 'function'
}

export function isValidAdminRoute (route: AyazmoRouteOptions): boolean {
  return 'method' in route && 'url' in route && 'preHandler' in route && typeof route.handler === 'function'
}

export function isRouteEnabled (route: PluginRoutes): boolean {
  return route.enabled !== false
}

/**
 * Validates if the route passed in the config is a valid admin route override. It should have a method and url.
 *
 * @param Object route
 * @returns boolean
 */
export function isValidAdminRouteOverride (route: PluginRoutes): boolean {
  return 'method' in route && 'url' in route
}

/**
 * Parses the preHandler array and converts each string value into a app.value insude an array
 *
 * @param app
 * @param route
 * @returns route with the preHandler array parsed
 */
export function parsePreHandler (app: AyazmoInstance, route: AyazmoRouteOptions): AyazmoRouteOptions {
  if (route.preHandler == null) {
    return route
  }

  const preHandler = route.preHandler
  if (Array.isArray(preHandler) && preHandler.length > 0) {
    // check the array for string values and convert each string value into a app.value insude an array
    const newPreHandler = preHandler.map((handler) => {
      if (typeof handler === 'string' && app.hasDecorator(handler)) {
        return app[handler]
      } else if (Array.isArray(handler)) {
        return handler.map((h) => app[h])
      }
      return handler
    })

    return { ...route, preHandler: app.auth(newPreHandler) }
  }

  return route
}
