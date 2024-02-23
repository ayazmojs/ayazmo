import { AyazmoRouteOptions } from '@ayazmo/types'

export function isValidRoute (route: AyazmoRouteOptions): boolean {
  return 'method' in route && 'url' in route && typeof route.handler === 'function'
}
