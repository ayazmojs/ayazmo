import assert from "node:assert";
import { describe, it, after, before } from "node:test";
import buildServer, { __dirname } from "../../__fixtures__/build-server.js";
import { RedisMemoryServer } from 'redis-memory-server';
import path from "node:path";

describe("core: testing the redis publisher via Queue", () => {

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
    });
    server = buildServer(path.join(__dirname, 'emitter', 'redis-queue-ayazmo.config.js'))
    await server.loadDiContainer();
    await server.loadConfig();
    await server.maybeEnableRedis({
      host: await redisServer.getHost(),
      port: await redisServer.getPort(),
      closeClient: true,
      maxRetriesPerRequest: null,
      options: {
        tls: false
      }
    });
    await server.loadCoreServices();
    app = server.getServerInstance();
    const eventService = app.diContainer.resolve('eventService')
    worker = eventService.getEmitter().getAllWorkers().get('eventsQueue')
    queue = eventService.getEmitter().getPublisher().getInstance()
    await queue.waitUntilReady()
    await worker.waitUntilReady()
    await queue.drain()
  })

  after(async () => {
    await app.close()
    await redisServer.stop();
  })

  it("test redis connection", async () => {
    const redis = app.redis
    assert.ok(redis)
    assert.equal(redis.status, 'ready')
  })

  it("successfully loads the redis publisher config with default queue options", () => {
    const eventService = app.diContainer.resolve('eventService')
    assert.equal(eventService.constructor.name, 'EventService')

    const emitter = eventService.getEmitter()
    assert.equal(emitter.constructor.name, 'RedisEventEmitter')

    const publisher = emitter.getPublisher()
    assert.equal(publisher.constructor.name, 'AyazmoPublisher')
    assert.equal(publisher.isFlow, false)

    const queue = publisher.getInstance();
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
        removeOnFail: { count: 0 },
      }
    )
  })

  it("successfully publishes a job to the queue", async () => {
    let jobId;
    let interval;
    let completed = false;
    const eventService = app.diContainer.resolve('eventService')
    const emitter = eventService.getEmitter()
    const queue = emitter.getPublisher().getInstance()
    await queue.waitUntilReady()
    await worker.waitUntilReady()

    queue.on('waiting', async (job) => {
      jobId = job.id;
    });

    await eventService.publish('test-queue-event', { key: 'value' })
    const handler = async (payload) => {
      assert.deepStrictEqual(payload, { key: 'value' })
    }

    await eventService.subscribe('test-queue-event', handler)
    assert.equal(emitter.getEventHandlers().size, 1)

    // wait until the job has been consumed but timeout after 10 seconds
    await new Promise((resolve, reject) => {
      if (completed) {
        resolve();
      }

      const startTime = Date.now();

      // set a time counter in an interval
      interval = setInterval(async () => {
        const elapsedTime = Date.now() - startTime;
        // display the elapsed time in seconds in place instead of on new line
        console.log(`\rConsuming elapsed time: ${(elapsedTime / 1000).toFixed(2)} seconds`);
        if (elapsedTime > 20000) {
          clearInterval(interval);
          reject(new Error('Timeout after 20 seconds'));
        }
      }, 1000);

      worker.on('completed', async (job) => {
        if (job.id === jobId) {
          clearInterval(interval);
          resolve();
        }
      });
    })

    await eventService.unsubscribe('test-queue-event', handler)
    assert.equal(emitter.getEventHandlers().size, 0)
    await worker.close()
  })
})