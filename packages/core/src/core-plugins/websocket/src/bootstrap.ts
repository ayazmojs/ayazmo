import { z } from 'zod'
import type { AyazmoInstance, PluginConfig } from '@ayazmo/types'

// Plugin configuration schema
export const schema = z.object({
  name: z.literal('websocket'),
  settings: z.object({
    enabled: z.boolean().optional().default(true),
    // Configuration options for @fastify/websocket
    // These match the options from the @fastify/websocket package
    options: z.object({
      maxPayload: z.number().optional(),
      path: z.string().optional(),
      verifyClient: z.function().optional(),
      clientTracking: z.boolean().optional(),
      perMessageDeflate: z.union([z.boolean(), z.object({}).passthrough()]).optional(),
    }).optional().default({}),
    enableExampleRoutes: z.boolean().optional().default(false)
  }).optional().default({})
})

/**
 * Initialize websocket support for Ayazmo
 * 
 * @param app The Ayazmo application instance
 * @param config Plugin configuration
 * @returns Object with shutdown function
 */
export default async function(app: AyazmoInstance, config: PluginConfig): Promise<{ shutdown?: () => Promise<void> }> {
  app.log.info('Initializing websocket core plugin')
  
  const settings = config.settings || {}
  
  if (settings.enabled === false) {
    app.log.info('Websocket support is disabled via configuration')
    return { shutdown: async () => {} }
  }
  
  try {
    // Dynamic import of @fastify/websocket
    const websocket = await import('@fastify/websocket')
    
    // Check for legacy configuration in app.websocket
    // This maintains backward compatibility with the previous implementation
    const legacyConfig = app.diContainer.resolve('configService').get('app.websocket');
    const options = legacyConfig || settings.options || {}
    
    if (legacyConfig) {
      app.log.info('Using legacy websocket configuration from app.websocket. Consider migrating to corePlugins.websocket.options')
    }
    
    // Register the websocket plugin with the options from config
    await app.register(websocket.default, options)
    
    app.log.info('Websocket support enabled successfully')
    
    return {
      shutdown: async () => {
        app.log.info('Shutting down websocket core plugin')
        // The actual WebSocket connections will be closed by Fastify when it shuts down
      }
    }
  } catch (error) {
    app.log.error(`Failed to initialize websocket support: ${error.message}`)
    throw error
  }
} 