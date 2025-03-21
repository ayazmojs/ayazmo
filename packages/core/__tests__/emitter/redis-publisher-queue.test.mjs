import assert from 'node:assert'
import { describe, it, after, before } from 'node:test'
import buildServer, { __dirname } from '../../__fixtures__/build-server.js'
import { RedisMemoryServer } from 'redis-memory-server'
import path from 'node:path'

describe('core: testing the redis publisher via Queue', () => {
  let app,
    server,
    redisServer,
    worker,
    queue

  before(async () => {
    redisServer = new RedisMemoryServer({
      instance: {
        port: 6380,
        ip: '127.0.0.1'
      },
      autoStart: true
    })
    server = buildServer(path.join(__dirname, 'emitter', 'redis-queue-ayazmo.config.js'))
    await server.loadDiContainer()
    await server.initializeConfiguration()
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
    worker = eventService.getEmitter().getAllWorkers().get('eventsQueue')
    queue = eventService.getEmitter().getPublisher().getInstance()
    await queue.waitUntilReady()
    await worker.waitUntilReady()
    await queue.drain()
  })

  after(async () => {
    await queue.drain()
    await worker.close()
    await app.close()
    await redisServer.stop()
  })

  it('test redis connection', async () => {
    const redis = app.redis
    assert.ok(redis)
    assert.equal(redis.status, 'ready')
  })

  it('successfully loads the redis publisher config with default queue options', () => {
    const eventService = app.diContainer.resolve('eventService')
    assert.equal(eventService.constructor.name, 'EventService')

    const emitter = eventService.getEmitter()
    assert.equal(emitter.constructor.name, 'RedisEventEmitter')

    const publisher = emitter.getPublisher()
    assert.equal(publisher.constructor.name, 'AyazmoPublisher')
    assert.equal(publisher.isFlow, false)

    const queue = publisher.getInstance()
    assert.equal(queue.constructor.name, 'Queue')
    assert.equal(worker.constructor.name, 'Worker')

    // assert that the default job options are set
    assert.deepEqual(
      queue.defaultJobOptions,
      {
        attempts: 3,
        backoff: {
          delay: 1000,
          type: 'exponential'
        },
        removeOnComplete: true,
        removeOnFail: { count: 0 }
      }
    )
  })

  it('successfully publishes a job to the queue', async () => {
    let jobId
    let interval
    const completed = false
    const eventService = app.diContainer.resolve('eventService')
    const emitter = eventService.getEmitter()
    const queue = emitter.getPublisher().getInstance()
    await queue.waitUntilReady()
    await worker.waitUntilReady()

    queue.on('waiting', async (job) => {
      jobId = job.id
    })

    await eventService.publish('comment.create', { key: 'value' })
    const handler = async (job) => {
      assert.deepStrictEqual(job.data, { key: 'value' })
    }

    await eventService.subscribe('comment.create', handler)
    assert.equal(emitter.getEventHandlers().size, 1)

    // wait until the job has been consumed but timeout after 20 seconds
    await new Promise((resolve, reject) => {
      if (completed) {
        resolve()
      }

      const startTime = Date.now()

      // set a time counter in an interval
      interval = setInterval(async () => {
        const elapsedTime = Date.now() - startTime
        // display the elapsed time in seconds in place instead of on new line
        console.log(`\rWorker consuming elapsed time: ${(elapsedTime / 1000).toFixed(2)} seconds`)
        if (elapsedTime > 20000) {
          clearInterval(interval)
          reject(new Error('Timeout after 20 seconds'))
        }
      }, 1000)

      worker.on('completed', async (job) => {
        if (job.id === jobId) {
          clearInterval(interval)
          resolve()
        }
      })
    })

    await eventService.unsubscribe('comment.create', handler)
    assert.equal(emitter.getEventHandlers().size, 0)
  })

  it('should publish event with onBeforePublish callback via Redis', async () => {
    const eventService = app.diContainer.resolve('eventService')
    const testEvent = 'test.callback.event'
    const testPayload = { key: 'value' }
    let receivedPayload = null
    let jobId

    const handler = async (job) => {
      receivedPayload = job.data
    }

    await eventService.subscribe(testEvent, handler)

    queue.on('waiting', async (job) => {
      jobId = job.id
    })

    await eventService.publish(testEvent, testPayload, {
      onBeforePublish: async (event, data) => {
        return data
      }
    })

    // Wait for job completion
    await new Promise((resolve) => {
      worker.on('completed', async (job) => {
        if (job.id === jobId) {
          resolve()
        }
      })
    })

    assert.deepStrictEqual(receivedPayload, testPayload, 'Payload should be received unchanged')
    await eventService.unsubscribe(testEvent, handler)
  })

  it('should modify payload through onBeforePublish callback via Redis', async () => {
    const eventService = app.diContainer.resolve('eventService')
    const testEvent = 'test.modified.event'
    const testPayload = { key: 'value' }
    const modifiedPayload = { key: 'modified' }
    let receivedPayload = null
    let jobId

    const handler = async (job) => {
      receivedPayload = job.data
    }

    await eventService.subscribe(testEvent, handler)

    queue.on('waiting', async (job) => {
      jobId = job.id
    })

    await eventService.publish(testEvent, testPayload, {
      onBeforePublish: async (event, data) => {
        return modifiedPayload
      }
    })

    // Wait for job completion
    await new Promise((resolve) => {
      worker.on('completed', async (job) => {
        if (job.id === jobId) {
          resolve()
        }
      })
    })

    assert.deepStrictEqual(receivedPayload, modifiedPayload, 'Modified payload should be received')
    await eventService.unsubscribe(testEvent, handler)
  })

  it('should not publish event when onBeforePublish returns null via Redis', async () => {
    const eventService = app.diContainer.resolve('eventService')
    const testEvent = 'test.null.event'
    const testPayload = { key: 'value' }
    let wasHandlerCalled = false
    let jobReceived = false

    const handler = async () => {
      wasHandlerCalled = true
    }

    await eventService.subscribe(testEvent, handler)

    // Monitor if any job is added to the queue
    queue.on('waiting', () => {
      jobReceived = true
    })

    await eventService.publish(testEvent, testPayload, {
      onBeforePublish: async (event, data) => {
        return null
      }
    })

    // Give some time for any potential job processing
    await new Promise(resolve => setTimeout(resolve, 1000))

    assert.strictEqual(wasHandlerCalled, false, 'Handler should not be called when onBeforePublish returns null')
    assert.strictEqual(jobReceived, false, 'No job should be added to the queue')
    await eventService.unsubscribe(testEvent, handler)
  })

  it('should not publish event when event is not in publishOn configuration', async () => {
    const eventService = app.diContainer.resolve('eventService')
    const testEvent = 'unauthorized.event'
    const testPayload = { key: 'value' }
    let wasHandlerCalled = false
    let jobReceived = false

    const handler = async () => {
      wasHandlerCalled = true
    }

    await eventService.subscribe(testEvent, handler)

    // Monitor if any job is added to the queue
    queue.on('waiting', () => {
      jobReceived = true
    })

    // Add debug listeners to verify behavior
    queue.on('added', () => {
      console.log('Job unexpectedly added to queue')
    })

    await eventService.publish(testEvent, testPayload)

    // Give some time for any potential job processing
    await new Promise(resolve => setTimeout(resolve, 1000))

    assert.strictEqual(wasHandlerCalled, false, 'Handler should not be called for unauthorized event')
    assert.strictEqual(jobReceived, false, 'No job should be added to queue for unauthorized event')
    await eventService.unsubscribe(testEvent, handler)
  })
})
