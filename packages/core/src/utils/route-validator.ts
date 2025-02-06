import { AyazmoInstance, AyazmoRouteOptions, PluginRoutes } from '@ayazmo/types'

interface RouteValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateRoute(route: AyazmoRouteOptions): RouteValidationResult {
  const errors: string[] = [];

  if (!('method' in route)) {
    errors.push('Missing required property: "method"');
  }

  if (!('url' in route)) {
    errors.push('Missing required property: "url"');
  }

  if (typeof route.handler !== 'function') {
    errors.push('Invalid or missing "handler": Must be a function');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateAdminRoute(route: AyazmoRouteOptions): RouteValidationResult {
  const errors: string[] = [];

  if (!('method' in route)) {
    errors.push('Missing required property: "method"');
  }

  if (!('url' in route)) {
    errors.push('Missing required property: "url"');
  }

  if (!('preHandler' in route)) {
    errors.push('Missing required property: "preHandler"');
  }

  if (typeof route.handler !== 'function') {
    errors.push('Invalid or missing "handler": Must be a function');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isRouteEnabled(route: PluginRoutes): boolean {
  return route.enabled !== false;
}

/**
 * Validates if the route passed in the config is a valid admin route override. It should have a method and url.
 *
 * @param Object route
 * @returns boolean
 */
export function isValidAdminRouteOverride(route: PluginRoutes): boolean {
  return 'method' in route && 'url' in route;
}

/**
 * Parses the preHandler array and converts each string value into a app.value inside an array
 *
 * @param app
 * @param route
 * @returns route with the preHandler array parsed
 */
export function parsePreHandler(app: AyazmoInstance, route: AyazmoRouteOptions): AyazmoRouteOptions {
  if (route.preHandler == null) {
    return route;
  }

  const preHandler = route.preHandler;
  if (Array.isArray(preHandler) && preHandler.length > 0) {
    // check the array for string values and convert each string value into a app.value inside an array
    const newPreHandler = preHandler.map((handler) => {
      if (typeof handler === 'string' && app.hasDecorator(handler)) {
        return app[handler];
      } else if (Array.isArray(handler)) {
        return handler.map((h) => app[h]);
      }
      return handler;
    });

    return { ...route, preHandler: app.auth(newPreHandler) };
  }

  return route;
}
