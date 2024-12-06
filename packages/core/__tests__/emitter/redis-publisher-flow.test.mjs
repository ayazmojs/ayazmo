import assert from 'node:assert'
import { describe, it, after, before } from 'node:test'
import buildServer, { __dirname } from '../../__fixtures__/build-server.js'
import { RedisMemoryServer } from 'redis-memory-server'
import path from 'node:path'
import { once } from 'events'

describe('core: testing the redis publisher via Flow', () => {
  let app,
    server,
    redisServer,
    workers,
    publisher,
    flowPublisher

  before(async () => {
    redisServer = new RedisMemoryServer({
      instance: {
        port: 6380,
        ip: '127.0.0.1'
      },
      autoStart: true
    })
    server = buildServer(path.join(__dirname, 'emitter', 'redis-flow-ayazmo.config.js'))
    await server.loadDiContainer()
    await server.loadConfig()
    await server.maybeEnableRedis({
      host: await redisServer.getHost(),
      port: await redisServer.getPort(),
      closeClient: true,
      maxRetriesPerRequest: null,
      options: {
        tls: false
      }
    })
    await server.loadCoreServices()
    app = server.getServerInstance()
    const eventService = app.diContainer.resolve('eventService')
    workers = eventService.getEmitter().getAllWorkers()
    publisher = eventService.getEmitter().getPublisher()
    flowPublisher = publisher.getInstance()
    for (const worker of workers.values()) {
      await worker.waitUntilReady()
    }
    await flowPublisher.waitUntilReady()
  })

  after(async () => {
    // close all workers if they are still running
    for (const worker of workers.values()) {
      if (worker.isRunning()) {
        await worker.close()
      }
    }

    if (await redisServer.getInstanceInfo()) {
      await redisServer.stop()
    }

    await app.close()
  })

  it('test redis connection', async () => {
    const redis = app.redis
    assert.ok(redis)
    assert.equal(redis.status, 'ready')
  })

  it('successfully builds a publisher map', async () => {
    const eventService = app.diContainer.resolve('eventService')
    const emitter = eventService.getEmitter()
    const publisher = emitter.getPublisher()
    const pm = publisher.getEventPublishersMap()

    assert.ok(pm)
    assert.equal(pm.size, 2)
    assert.equal(pm.get('comment.create').length, 2)
    assert.equal(pm.get('comment.delete').length, 1)
  })

  it('successfully loads the redis publisher config with default flow options', () => {
    const eventService = app.diContainer.resolve('eventService')
    assert.equal(eventService.constructor.name, 'EventService')

    const emitter = eventService.getEmitter()
    assert.equal(emitter.constructor.name, 'RedisEventEmitter')

    const publisher = emitter.getPublisher()
    assert.equal(publisher.constructor.name, 'AyazmoPublisher')
    assert.equal(publisher.isFlow, true)
    assert.equal(flowPublisher.constructor.name, 'FlowProducer')
    for (const worker of workers.values()) {
      assert.equal(worker.constructor.name, 'Worker')
    }
  })

  it('successfully publishes one job to two separate queues', async () => {
    let workerCommentsProcessed = false
    let workerEventsProcessed = false
    const data = {
      title: 'test-flow-event-1',
      id: 1,
      content: 'test-flow-event-1',
      name: 'comment.create'
    }

    const handler = (job) => {
      assert.equal(job.data.id, 1)
      if (job.queue.name === 'comments') {
        workerCommentsProcessed = true
      } else {
        workerEventsProcessed = true
      }
    }
    const eventService = app.diContainer.resolve('eventService')

    await eventService.subscribe('comment.create', handler)

    await publisher.publish('comment.create', data)

    await new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        if (workerCommentsProcessed && workerEventsProcessed) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        reject(new Error('Workers did not process the messages in 10 seconds'))
      }, 10000)
    })

    assert.ok(workerCommentsProcessed, 'worker comments did process')
    assert.ok(workerEventsProcessed, 'worker events did process')
  })

  it('successfully creates multiple workers', async () => {
    assert.equal(workers.size, 2)
    assert.ok(workers.get('eventsQueue'))
    assert.ok(workers.get('comments'))
  })

  it('gracefully shuts down workers on SIGINT', async () => {
    const shutdownPromise = once(process, 'exit')

    process.kill(process.pid, 'SIGINT')
    await shutdownPromise

    for (const worker of workers.values()) {
      assert.equal(worker.isRunning(), false)
    }
  })
})
