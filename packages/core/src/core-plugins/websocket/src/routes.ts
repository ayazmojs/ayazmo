import { AyazmoInstance, PluginSettings } from '@ayazmo/types'

/**
 * Register websocket example routes if enabled
 * This is primarily a demonstration of websocket usage within Ayazmo
 * 
 * @param app The Ayazmo application instance
 * @param settings Plugin settings from configuration
 */
export default async function (app: AyazmoInstance, settings: PluginSettings = {}): Promise<void> {
  const enableExampleRoutes = settings.enableExampleRoutes === true
  
  // Only register example routes if explicitly enabled
  if (!enableExampleRoutes) {
    return
  }
  
  // Register an example echo websocket route
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.get('/ws/echo', { websocket: true }, (connection, req) => {
    app.log.debug('WebSocket client connected to /ws/echo')
    
    // In @fastify/websocket, the connection is directly the socket
    connection.on('message', (message) => {
      // Echo the message back to the client
      connection.send(message)
    })
    
    connection.on('close', () => {
      app.log.debug('WebSocket client disconnected from /ws/echo')
    })
  })
  
  app.log.info('Registered websocket example routes')
} 