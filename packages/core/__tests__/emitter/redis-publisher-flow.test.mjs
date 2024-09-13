import assert from "node:assert";
import { describe, it, after, before } from "node:test";
import buildServer, { __dirname } from "../../__fixtures__/build-server.js";
import { RedisMemoryServer } from 'redis-memory-server';
import path from "node:path";
import { once } from 'events';

describe("core: testing the redis publisher via Flow", () => {

  let app,
    server,
    redisServer,
    workers,
    publisher,
    flowPublisher

  before(async () => {
    // ... existing setup code ...
    server = buildServer(path.join(__dirname, 'emitter', 'redis-flow-ayazmo.config.js'))
    await server.loadDiContainer();
    await server.loadConfig();
    await server.maybeEnableRedis({
      host: '127.0.0.1', //await redisServer.getHost(),
      port: '6380', //await redisServer.getPort(),
      closeClient: true,
      maxRetriesPerRequest: null,
      options: {
        tls: false
      }
    });
    await server.loadCoreServices();
    app = server.getServerInstance();
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
    await app.close()

    // close all workers if they are still running
    for (const worker of workers.values()) {
      if (worker.isRunning()) {
        await worker.close()
      }
    }
    // await redisServer.stop();
  })

  it("test redis connection", async () => {
    const redis = app.redis
    assert.ok(redis)
    assert.equal(redis.status, 'ready')
  })

  it("successfully builds a queue map", async () => {
    const eventService = app.diContainer.resolve('eventService')
    const emitter = eventService.getEmitter()
    const publisher = emitter.getPublisher()
    const qm = publisher.getEventQueueMap()

    assert.ok(qm)
    assert.equal(qm.size, 2)
    assert.equal(qm.get('comment.create').length, 2)
    assert.equal(qm.get('comment.delete').length, 1)
  })

  it("successfully loads the redis publisher config with default flow options", () => {
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

  it("successfully publishes one job to two separate queues", async () => {
    const job = {
      title: 'test-flow-event-1',
      id: 1,
      content: 'test-flow-event-1'
    }
    await publisher.publish('comment.create', job)
    for (const worker of workers.values()) {
      await worker.close()
    }
  })

  it("successfully creates multiple workers", async () => {
    assert.equal(workers.size, 2)
    assert.ok(workers.get('eventsQueue'))
    assert.ok(workers.get('comments'))
  })

  it("each worker processes only its own queue", async () => {
    const job1 = {
      title: 'test-flow-event-2',
      id: 2,
      content: 'test-flow-event-2'
    }
    const job2 = {
      title: 'test-flow-event-3',
      id: 3,
      content: 'test-flow-event-3'
    }
    await publisher.publish('comment.create', job1)
    await publisher.publish('comment.delete', job2)

    // Add assertions to check that each worker processed the correct jobs
    // This might involve adding some state tracking in the handlers
  })

  it("handles uncaught exceptions", async () => {
    const error = new Error('Test uncaught exception');
    const originalLogError = app.log.error;
    let logErrorCalled = false;
    app.log.error = (message) => { logErrorCalled = true; };

    process.emit('uncaughtException', error);
    assert.ok(logErrorCalled);

    app.log.error = originalLogError;
  });

  it("handles unhandled rejections", async () => {
    const reason = 'Test unhandled rejection';
    const originalLogError = app.log.error;
    let logErrorCalled = false;
    app.log.error = (message) => { logErrorCalled = true; };

    process.emit('unhandledRejection', reason, Promise.reject(reason));
    assert.ok(logErrorCalled);

    app.log.error = originalLogError;
  });

  it("gracefully shuts down workers on SIGINT", async () => {
    const shutdownPromise = once(process, 'exit');

    process.kill(process.pid, 'SIGINT');
    await shutdownPromise;

    for (const worker of workers.values()) {
      assert.equal(worker.isRunning(), false);
    }
  });
})