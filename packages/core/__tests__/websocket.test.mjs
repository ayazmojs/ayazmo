import assert from 'node:assert'
import { describe, it, after, before } from 'node:test'
import { buildTestServer, cleanupAllTestConfigs } from '@ayazmo/utils'

let server, fastifyInstance

describe('core: testing websocket core plugin', () => {
  before(async () => {
    // Create a test server with websocket plugin enabled and example routes
    server = await buildTestServer('websocket-test', {
      corePlugins: {
        'websocket': {
          enableExampleRoutes: true
        }
      }
    })
    
    // Start the server and get the fastify instance
    fastifyInstance = await server.startAndGetInstance()
  })

  after(async () => {
    // Clean up server and config files
    await server.cleanup()
    // Additional safety - clean all configs
    await cleanupAllTestConfigs()
  })

  it('should have registered websocket plugin', () => {
    // Check if the websocket decorator exists
    assert(fastifyInstance.hasDecorator('websocketServer'), 'websocketServer decorator should be registered')
  })

  it('should have registered example echo route', () => {
    const hasRoute = fastifyInstance.hasRoute({
      method: 'GET',
      url: '/ws/echo'
    })
    assert(hasRoute, 'Example WebSocket route /ws/echo should be registered')
  })

  it('should be able to inject a websocket connection', async () => {
    // The injectWS function should be available if @fastify/websocket is properly registered
    assert(typeof fastifyInstance.injectWS === 'function', 'injectWS function should be available')
    
    // Test the WebSocket functionality if possible
    const ws = await fastifyInstance.injectWS('/ws/echo')
    
    // Create a promise that will be resolved when we receive a message
    const messagePromise = new Promise(resolve => {
      ws.on('message', data => {
        resolve(data.toString())
      })
    })
    
    // Send a test message
    const testMessage = 'Hello from WebSocket test'
    ws.send(testMessage)
    
    // Wait for the response and verify it's an echo
    const response = await messagePromise
    assert.equal(response, testMessage, 'Echo route should return the sent message')
    
    // Clean up
    ws.terminate()
  })
}) 