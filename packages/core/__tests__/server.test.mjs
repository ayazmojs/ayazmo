import assert from 'node:assert'
import path from 'node:path'
import { describe, it, after, before } from 'node:test'
import buildServer, { __dirname } from '../__fixtures__/build-server.js'

let server
let fastifyInstance

describe('core: testing the server', () => {
  before(async () => {
    server = buildServer(path.join(__dirname, 'plugins', 'ayazmo.config.js'))
    await server.start()
    fastifyInstance = server.getServerInstance()
  })

  after(async () => {
    await fastifyInstance.close()
  })

  it('should create a Fastify instance', () => {
    assert(fastifyInstance, 'Fastify instance should be created')
  })

  it('successfully loads the server', async () => {
    assert.ok(server)
  })

  it('should register health routes', async () => {
    const hasRoute = fastifyInstance.hasRoute({
      method: 'GET',
      url: '/health'
    })
    assert(hasRoute, 'Routes should include /health')
  })

  it('should successfully call health route', async () => {
    const response = await fastifyInstance.inject({
      method: 'GET',
      url: '/health'
    })

    assert.equal(response.statusCode, 200)
    assert.equal(JSON.parse(response.payload).status, 'ok')
  })

  it('should register graphql', async () => {
    const response = await fastifyInstance.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          query {
            health
          }
        `
      }
    })

    assert.equal(response.statusCode, 200)
    assert.equal(JSON.parse(response.payload).data.health, true)
  })

  it('should register auth providers', async () => {
    const hasAuthDecorator = fastifyInstance.hasDecorator('auth')
    assert(hasAuthDecorator, 'Auth decorator should be registered')

    const hasAuthProvider = fastifyInstance.hasDecorator('anonymousStrategy')
    assert(hasAuthProvider, 'Anonymous strategy should be registered')

    const hasUserAuthProvider = fastifyInstance.hasDecorator('userAuthChain')
    assert(hasUserAuthProvider, 'User auth chain should be registered')
  })

  // test dicontainer is correctly registered
  it('should register di container', async () => {
    const hasDiContainer = fastifyInstance.hasDecorator('diContainer')
    assert(hasDiContainer, 'DI container should be registered')
  })
})
