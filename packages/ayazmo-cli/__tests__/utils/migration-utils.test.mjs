import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validatePlugin,
  determineSelectedPlugin,
  mergeDbConfig,
  resolveSchema,
  createMigrationResult
} from '../../dist/utils/migration-utils.js'

// Test data
const mockPlugins = [
  { name: 'plugin1', settings: {} },
  { name: 'plugin2', settings: {} }
]

const mockGlobalConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    user: 'default',
    password: 'secret',
    dbName: 'testdb',
    schema: 'test_schema'
  }
}

const mockDbCredentials = {
  host: 'testhost',
  port: 5433,
  user: 'testuser',
  password: 'testpass',
  dbName: 'testdb2'
}

describe('migration-utils', () => {
  describe('validatePlugin', () => {
    it('should throw error when plugins array is empty', (t) => {
      assert.throws(
        () => validatePlugin('test', []),
        { message: 'No plugins enabled!' }
      )
    })

    it('should throw error when plugins is not an array', (t) => {
      assert.throws(
        () => validatePlugin('test', null),
        { message: 'No plugins enabled!' }
      )
    })

    it('should throw error when specified plugin does not exist', (t) => {
      assert.throws(
        () => validatePlugin('nonexistent', mockPlugins),
        { message: 'Plugin "nonexistent" is not enabled in your configuration. Please check your config file.' }
      )
    })

    it('should return true when no plugin specified', (t) => {
      assert.equal(validatePlugin(undefined, mockPlugins), true)
    })

    it('should return true when specified plugin exists', (t) => {
      assert.equal(validatePlugin('plugin1', mockPlugins), true)
    })
  })

  describe('determineSelectedPlugin', () => {
    it('should return single plugin when plugin option specified', (t) => {
      const result = determineSelectedPlugin({ plugin: 'plugin1' })
      assert.deepEqual(result, { type: 'single', value: 'plugin1' })
    })

    it('should return all plugins when no plugin specified and not interactive', (t) => {
      const result = determineSelectedPlugin({})
      assert.deepEqual(result, { type: 'all', value: 'all' })
    })

    it('should handle specific plugin choice correctly', (t) => {
      const result = determineSelectedPlugin(
        { interactive: true },
        { type: 'specific', value: 'plugin2' }
      )
      assert.deepEqual(result, { type: 'single', value: 'plugin2' })
    })

    it('should handle all plugins choice correctly', (t) => {
      const result = determineSelectedPlugin(
        { interactive: true },
        { type: 'all', value: 'all' }
      )
      assert.deepEqual(result, { type: 'all', value: 'all' })
    })
  })

  describe('mergeDbConfig', () => {
    it('should return global config when no credentials provided', (t) => {
      const result = mergeDbConfig(mockGlobalConfig)
      assert.deepEqual(result, mockGlobalConfig.database)
    })

    it('should override global config with provided credentials', (t) => {
      const result = mergeDbConfig(mockGlobalConfig, mockDbCredentials)
      assert.deepEqual(result, {
        ...mockGlobalConfig.database,
        ...mockDbCredentials
      })
    })

    it('should handle missing global database config', (t) => {
      const result = mergeDbConfig({}, mockDbCredentials)
      assert.deepEqual(result, mockDbCredentials)
    })
  })

  describe('resolveSchema', () => {
    it('should prioritize env variable over config', (t) => {
      const env = { DB_SCHEMA: 'env_schema' }
      const result = resolveSchema(env, mockGlobalConfig)
      assert.equal(result, 'env_schema')
    })

    it('should use config when env variable not present', (t) => {
      const result = resolveSchema({}, mockGlobalConfig)
      assert.equal(result, 'test_schema')
    })

    it('should default to public when no schema specified', (t) => {
      const result = resolveSchema({}, {})
      assert.equal(result, 'public')
    })
  })

  describe('createMigrationResult', () => {
    it('should create success result with migrations', (t) => {
      const migrations = ['migration1', 'migration2']
      const result = createMigrationResult(true, migrations)
      assert.deepEqual(result, {
        success: true,
        appliedMigrations: migrations
      })
    })

    it('should create error result', (t) => {
      const error = new Error('Test error')
      const result = createMigrationResult(false, undefined, error)
      assert.deepEqual(result, {
        success: false,
        error
      })
    })
  })
}) 