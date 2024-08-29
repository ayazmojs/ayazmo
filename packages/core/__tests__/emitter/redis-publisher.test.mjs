import assert from "node:assert";
import { describe, it, after } from "node:test";
import { Queue, FlowProducer } from 'bullmq'
import { AyazmoPublisher } from "../../src/emitter/RedisEventEmitter.js"
import { appConfigDefaultQueue, appConfigQueue, appConfigFlow } from "../../__fixtures__/emitter/app-config.js";
import buildApp from "../../__fixtures__/build-app.js";
const app = buildApp()

describe("core: testing the redis publisher", () => {
  after(() => {
    app.close()
  })

  it("successfully loads the redis publisher config with default queue options", () => {
    const publisher = new AyazmoPublisher(appConfigDefaultQueue, app)
    assert.ok(publisher)
    assert.ok(!publisher.isFlow)
    // assert that the publisher is an instance of Queue
    const queue = publisher.getPublisher()
    assert.ok(queue instanceof Queue)

    // assert that the default job options are set
    assert.deepEqual(queue.defaultJobOptions, {
      removeOnComplete: false,
      removeOnFail: false
    })
  })

  it("successfully loads the redis publisher config for Queue", () => {
    const publisher = new AyazmoPublisher(appConfigQueue, app)
    assert.ok(publisher)
    assert.ok(!publisher.isFlow)
    // assert that the publisher is an instance of Queue
    const queue = publisher.getPublisher()
    assert.ok(queue instanceof Queue)

    // assert that the default job options are overridden by the app config
    assert.deepEqual(queue.defaultJobOptions, {
      removeOnComplete: 100,
      removeOnFail: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      }
    })
  })

  it("successfully loads the redis publisher config for Flow", () => {
    const publisher = new AyazmoPublisher(appConfigFlow, app)
    assert.ok(publisher)
    assert.ok(publisher.isFlow)
    // assert that the publisher is an instance of FlowProducer
    const flow = publisher.getPublisher()
    assert.ok(flow instanceof FlowProducer)
    assert.equal(flow.queueKeys.prefix, "bull")
  })
})