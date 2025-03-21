import { AyazmoInstance, FastifyRequest, FastifyReply, PluginSettings } from '@ayazmo/types'

// Define the handler type for TypeScript
type HealthCheckHandler = (request: FastifyRequest, reply: FastifyReply, app?: AyazmoInstance) => Promise<void> | void;

// Default health check handler
const defaultHealthCheckHandler: HealthCheckHandler = async (request, reply) => {
  reply.code(200).send({ status: 'ok' })
}

/**
 * Register health check routes
 * 
 * @param app - The Ayazmo instance
 * @param settings - Plugin settings
 */
export default async function (app: AyazmoInstance, settings: PluginSettings = {}): Promise<void> {
  const route = settings.route || '/health'
  
  // Get the handler function or use the default
  let handler = defaultHealthCheckHandler;

  // Check if a custom handler was provided
  if (settings.handler !== undefined) {
    if (typeof settings.handler === 'function') {
      handler = settings.handler;
      
      // Create a wrapper function that passes the app instance to the custom handler
      const originalHandler = handler;
      handler = (request, reply) => originalHandler(request, reply, app);
      
      app.log.debug('Using custom health check handler with app instance');
    } else {
      app.log.warn(`Health check handler provided is not a function (type: ${typeof settings.handler}). Using default handler instead.`);
      // Fallback to default handler (already assigned)
    }
  }
  
  app.log.debug(`Registering health check route at: ${route}`)
  
  // Register the health check route
  app.get(route, handler)
} 