import assert from "node:assert";
import { describe, it, before, after } from "node:test";
import path from "node:path";
import {
  constructPaths,
  getPluginRoot
} from "../../dist/plugins/plugin-manager.js"
import { pluginConfig } from "../../__fixtures__/config"
import buildServer, { __dirname } from "../../__fixtures__/build-server.js";
import { getTestHost } from "../../__fixtures__/helpers/get-test-host.js";

const plugins = pluginConfig.plugins

describe("core: testing the plugin manager", () => {
  let server;
  let app;
  let host;

  before(async () => {
    server = buildServer(path.join(__dirname, 'plugins', 'ayazmo.config.js'))
    await server.loadDiContainer();
    await server.loadConfig();
    await server.loadPlugins()
    app = server.getServerInstance()
    const config = app.diContainer.resolve('config');
    await app.listen(config.app.server);
    await app.ready();
    host = getTestHost(app)
  })

  after(async () => {
    await app.close()
  })

  it("tests plugin paths are constructed correctly", (t) => {
    const expected = {
      services: path.join(process.cwd(), plugins[0].name, 'dist', 'services'),
      graphql: path.join(process.cwd(), plugins[0].name, 'dist', 'graphql'),
      entities: path.join(process.cwd(), plugins[0].name, 'dist', 'entities'),
      routes: path.join(process.cwd(), plugins[0].name, 'dist', 'routes.js'),
      migrations: path.join(process.cwd(), plugins[0].name, 'dist', 'migrations'),
      subscribers: path.join(process.cwd(), plugins[0].name, 'dist', 'subscribers'),
      bootstrap: path.join(process.cwd(), plugins[0].name, 'dist', 'bootstrap.js'),
      config: path.join(process.cwd(), plugins[0].name, 'dist', 'config.template.js'),
      admin: {
        routes: path.join(process.cwd(), plugins[0].name, 'dist', 'admin', 'routes.js'),
      }
    }
    assert.deepEqual(constructPaths(plugins[0].name, process.cwd()), expected)
  })

  it("tests plugin root path is correct", () => {
    assert.equal(getPluginRoot(plugins[0].name, plugins[0].settings), path.join(process.cwd(), 'src', 'plugins', plugins[0].name))
  })

  it("tests plugin routes are loaded correctly", async () => {
    const config = app.diContainer.resolve('config')
    assert.equal(config.plugins.length, 1)
    assert.ok(config.plugins[0].path)

    const hasRoute = app.hasRoute({
      method: 'GET',
      url: '/v1/test'
    });
    assert(hasRoute, 'Routes should include /v1/test');

    const response = await fetch(path.join(host, 'v1/test'), {
      method: 'GET',
    });

    assert.equal(response.status, 200)
    const body = await response.json()
    assert.deepEqual(body, {
      id: 1,
      name: 'test',
      content: 'test content'
    })
  })
})