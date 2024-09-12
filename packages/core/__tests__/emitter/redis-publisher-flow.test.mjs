import assert from "node:assert";
import { describe, it, after, before } from "node:test";
import buildServer, { __dirname } from "../../__fixtures__/build-server.js";
import { RedisMemoryServer } from 'redis-memory-server';
import path from "node:path";
import { title } from "node:process";

describe("core: testing the redis publisher via Flow", () => {

  let app,
    server,
    redisServer,
    worker,
    publisher,
    flowPublisher

  before(async () => {
    // redisServer = new RedisMemoryServer({
    //   instance: {
    //     port: 6380,
    //     ip: '127.0.0.1'
    //   },
    //   autoStart: true
    // });
    // console.log(redisServer.getInstanceInfo())
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
    worker = eventService.getEmitter().getWorker()
    publisher = eventService.getEmitter().getPublisher()
    flowPublisher = publisher.getInstance()
    await worker.waitUntilReady()
    await flowPublisher.waitUntilReady()
  })

  after(async () => {
    await app.close()
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
    assert.equal(worker.constructor.name, 'Worker')
  })

  it("successfully publishes one jobs to two separate queues", async () => {
    const job = {
      title: 'test-flow-event-1',
      id: 1,
      content: 'test-flow-event-1'
    }
    await publisher.publish('comment.create', job)
    worker.close()
  })
})