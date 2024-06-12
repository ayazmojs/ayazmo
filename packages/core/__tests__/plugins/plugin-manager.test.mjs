import assert from "node:assert";
import { describe, it } from "node:test";
import path from "node:path";
import {
  constructPaths,
  getPluginRoot
} from "../../src/plugins/plugin-manager"
import { pluginConfig } from "../../__fixtures__/config"

const plugins = pluginConfig.plugins

describe("core: testing the plugin manager", () => {
  it("tests plugin paths are constructed correctly", (t) => {
    const expected = {
      services: path.join(process.cwd(), plugins[0].name, 'dist', 'services'),
      graphql: path.join(process.cwd(), plugins[0].name, 'dist', 'graphql'),
      entities: path.join(process.cwd(), plugins[0].name, 'dist', 'entities'),
      routes: path.join(process.cwd(), plugins[0].name, 'dist', 'routes.js'),
      migrations: path.join(process.cwd(), plugins[0].name, 'dist', 'migrations'),
      subscribers: path.join(process.cwd(), plugins[0].name, 'dist', 'subscribers'),
      bootstrap: path.join(process.cwd(), plugins[0].name, 'dist', 'bootstrap.js'),
      admin: {
        routes: path.join(process.cwd(), plugins[0].name, 'dist', 'admin', 'routes.js'),
      }
    }
    assert.deepEqual(constructPaths(plugins[0].name, process.cwd()), expected)
  })

  it("tests plugin root path is correct", () => {
    assert.equal(getPluginRoot(plugins[0].name, plugins[0].settings), path.join(process.cwd(), 'src', 'plugins', plugins[0].name))
  })
})