import { AyazmoRouteOptions, PluginRoutesCustom } from '@ayazmo/types'

export function isValidRoute (route: AyazmoRouteOptions): boolean {
  return 'method' in route && 'url' in route && typeof route.handler === 'function'
}

export function isRouteEnabled (route: AyazmoRouteOptions & PluginRoutesCustom): boolean {
  return route.enabled !== false
}