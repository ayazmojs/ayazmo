import { getRegisteredPlugins } from '@ayazmo/utils'
import * as assert from 'assert'
import { describe, it } from 'node:test'
import path from 'node:path'

describe('getRegisteredPlugins', () => {
  const cwd = process.cwd();

  it('should throw an error if plugins is not an array', () => {
    assert.throws(
      () => getRegisteredPlugins(null),
      {
        name: 'Error',
        message: 'Expected plugins to be an array'
      }
    );

    assert.throws(
      () => getRegisteredPlugins('not an array'),
      {
        name: 'Error',
        message: 'Expected plugins to be an array'
      }
    );

    assert.throws(
      () => getRegisteredPlugins({ invalid: 'object' }),
      {
        name: 'Error',
        message: 'Expected plugins to be an array'
      }
    );
  });

  it('should return an empty array if the input is an empty array', () => {
    const result = getRegisteredPlugins([]);
    assert.deepStrictEqual(result, []);
  });

  it('should not modify plugins that already have a path', () => {
    const plugins = [
      { name: 'plugin-with-path', path: '/custom/path', settings: {} }
    ];

    const result = getRegisteredPlugins(plugins);
    assert.deepStrictEqual(result, plugins);
  });

  it('should add correct path for private plugins', () => {
    const plugins = [
      { name: 'private-plugin', settings: { private: true } }
    ];

    const expectedPath = path.join(cwd, 'dist', 'plugins', 'private-plugin', 'src');
    const expected = [
      { name: 'private-plugin', settings: { private: true }, path: expectedPath }
    ];

    const result = getRegisteredPlugins(plugins);
    assert.deepStrictEqual(result, expected);
  });

  it('should add correct path for public plugins', () => {
    const plugins = [
      { name: 'public-plugin', settings: { private: false } }
    ];

    const expectedPath = path.join(cwd, 'node_modules', 'public-plugin', 'dist');
    const expected = [
      { name: 'public-plugin', settings: { private: false }, path: expectedPath }
    ];

    const result = getRegisteredPlugins(plugins);
    assert.deepStrictEqual(result, expected);
  });

  it('should handle plugins without a settings property', () => {
    const plugins = [
      { name: 'plugin-without-settings' }
    ];

    const expectedPath = path.join(cwd, 'node_modules', 'plugin-without-settings', 'dist');
    const expected = [
      { name: 'plugin-without-settings', path: expectedPath }
    ];

    const result = getRegisteredPlugins(plugins);
    assert.deepStrictEqual(result, expected);
  });

  it('should process a mix of different plugin configurations correctly', () => {
    const plugins = [
      { name: 'plugin-with-path', path: '/custom/path', settings: {} },
      { name: 'private-plugin', settings: { private: true } },
      { name: 'public-plugin', settings: { private: false } },
      { name: 'plugin-without-settings' }
    ];

    const expected = [
      { name: 'plugin-with-path', path: '/custom/path', settings: {} },
      { name: 'private-plugin', settings: { private: true }, path: path.join(cwd, 'dist', 'plugins', 'private-plugin', 'src') },
      { name: 'public-plugin', settings: { private: false }, path: path.join(cwd, 'node_modules', 'public-plugin', 'dist') },
      { name: 'plugin-without-settings', path: path.join(cwd, 'node_modules', 'plugin-without-settings', 'dist') }
    ];

    const result = getRegisteredPlugins(plugins);
    assert.deepStrictEqual(result, expected);
  });
}); 