import { RouteOptions } from 'fastify'

export function isValidRoute (route: RouteOptions): boolean {
  // Add any necessary validation logic for a route
  return 'method' in route && 'url' in route && typeof route.handler === 'function'
}
