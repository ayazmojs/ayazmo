import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { getEntityFiles, hasEntities, filterPluginsWithEntities } from '../../dist/utils/migration-helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('migration-helpers', () => {
  describe('getEntityFiles', () => {
    it('should return only .js files', async (t) => {
      t.mock.method(fs, 'readdir', async () => [
        'entity1.ts',
        'entity2.js',
        'README.md',
        'something.json'
      ])

      const files = await getEntityFiles('/some/path')
      assert.deepEqual(files, [
        path.join('/some/path', 'entity2.js')
      ])
    })

    it('should return empty array when directory read fails', async (t) => {
      t.mock.method(fs, 'readdir', async () => {
        throw new Error('Directory not found')
      })

      const files = await getEntityFiles('/bad/path')
      assert.deepEqual(files, [])
    })
  })

  describe('hasEntities', () => {
    it('should return true when directory has entity files', async (t) => {
      t.mock.method(fs, 'readdir', async () => ['entity1.js'])

      const result = await hasEntities('/some/path')
      assert.equal(result, true)
    })

    it('should return false when directory has no entity files', async (t) => {
      t.mock.method(fs, 'readdir', async () => ['README.md'])

      const result = await hasEntities('/some/path')
      assert.equal(result, false)
    })
  })

  describe('filterPluginsWithEntities', () => {
    it('should filter out plugins without entities', async (t) => {
      t.mock.method(fs, 'readdir', async (dir) => {
        if (dir.toString().includes('plugin1')) return ['entity1.js']
        return []
      })

      const plugins = [
        { name: 'plugin1', settings: {} },
        { name: 'plugin2', settings: {} }
      ]

      const result = await filterPluginsWithEntities(plugins)
      assert.deepEqual(result, [{ name: 'plugin1', settings: {} }])
    })
  })
}) 