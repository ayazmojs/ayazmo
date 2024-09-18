import assert from "node:assert";
import { describe, it, after, before } from "node:test";
import { asClass } from "awilix";
import buildServer from "../../__fixtures__/build-server.js";

describe("core: testing the in memory publisher", () => {

  let app,
    server

  after(async () => {
    await app.close()
  })

  before(async () => {
    server = buildServer()
    await server.loadDiContainer();
    await server.loadConfig();
    await server.loadCoreServices();
    app = server.getServerInstance()
    app.addHook('onRequest', async (request, reply) => {
      app.diContainer.register({
        dbService: asClass({ em: true })
      })
    })
  })

  it("successfully loads the server", () => {
    assert.ok(server)
  })

  // test eventService for publishing and consuming emitter events
  it('should publish and consume events with in memory event service', async () => {
    const eventService = app.diContainer.resolve('eventService');
    assert(eventService, 'Event service should be registered');

    // Define a test event and a listener
    const testEvent = 'test.event';
    const testPayload = { key: 'value' };

    const handler = (payload) => {
      assert.deepStrictEqual(payload, testPayload, 'Payload should match');
    };

    assert.equal(eventService.listSubscribers(testEvent).length, 0, 'No subscribers should be registered');

    // register a subscriber and test listSubscribers is 1 after registering and test the payload
    eventService.subscribe(testEvent, handler);

    assert.equal(eventService.listSubscribers(testEvent).length, 1, 'One subscriber should be registered');

    // Publish the event
    eventService.publish(testEvent, testPayload);

    // unsubscribe and test listSubscribers is 0 after unsubscribing
    eventService.unsubscribe(testEvent, handler);

    assert.equal(eventService.listSubscribers(testEvent).length, 0, 'No subscribers should be registered');
  });
})