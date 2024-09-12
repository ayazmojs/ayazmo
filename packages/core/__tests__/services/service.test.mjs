import assert from "node:assert";
import { describe, it, after, before } from "node:test";
import { diContainer } from '@fastify/awilix'
import { asClass } from "awilix";
import { BasePluginService } from '../../src/interfaces/BasePluginService.js'
import buildServer from "../../__fixtures__/build-server.js";
import { appConfigDefaultQueue } from "../../__fixtures__/emitter/app-config.js";

class TestService extends BasePluginService {
  constructor(container, pluginSettings, app) {
    super(container, pluginSettings, app)
  }

  async overrideQuery() {
    return 'test'
  }
}

let app,
  server,
  pluginSettings = appConfigDefaultQueue.plugins.find(plugin => plugin.name === 'ayazmo-plugin-test-service')

describe("core: testing the base service", () => {
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
      diContainer.register({
        dbService: asClass({ em: true })
      })
    })
  })

  it("successfully loads the server", () => {
    assert.ok(server)
  })

  it("successfully loads the base service", () => {
    const service = new TestService(app.diContainer, pluginSettings, app)
    assert.ok(service)
  })

  // test pluginSettings
  it("successfully loads the pluginSettings", () => {
    const service = new TestService(app.diContainer, pluginSettings, app)
    assert.ok(service.pluginSettings)
  })

  // test config is part of di container
  it('should resolve core services', async () => {
    const config = app.diContainer.resolve('config');
    assert(config, 'Config should be registered');

    const events = app.diContainer.resolve('eventService');
    assert(events, 'Events should be registered');

    const cacheService = app.diContainer.resolve('cacheService');
    assert(cacheService, 'Cache service should be registered');
  });
})