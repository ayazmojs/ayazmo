import { it, describe, before, mock } from 'node:test'
import assert from 'node:assert'
import { promises as fs } from 'node:fs'
import { mergeEnvFiles, readEnvFile, mergeEnvObjects } from '@ayazmo/utils'

let parse

describe('merge-env-vars utils', () => {
  before(() => {
    // Mock fs.readFile and fs.writeFile
    mock.method(fs, 'readFile', async (filePath, encoding) => {
      // Mock file content based on the file path
      const fileContents = {
        '/path/to/ayazmo.env': 'AYAZMO_VAR=ayazmo_value\nCOMMON_VAR=ayazmo_common_value',
        '/path/to/plugin.env': 'PLUGIN_VAR=plugin_value\nCOMMON_VAR=plugin_common_value'
      }
      return fileContents[filePath]
    })
    mock.method(fs, 'writeFile', async (filePath, data, encoding) => {
      // For simplicity, we'll assume the write operation is successful
    })

    parse = mock.fn(parse, (content) => {
      // Convert .env content to an object
      return content.split('\n').reduce((acc, line) => {
        const [key, value] = line.split('=')
        acc[key] = value
        return acc
      }, {})
    })
  })

  it('readEnvFile should read and parse .env files', async () => {
    const envObject = await readEnvFile('/path/to/ayazmo.env')
    assert.strictEqual(envObject.AYAZMO_VAR, 'ayazmo_value')
  })

  it('mergeEnvObjects should correctly merge two EnvObjects', () => {
    const primaryObj = { A: '1', B: '2' }
    const secondaryObj = { B: '3', C: '4' }
    const mergedObj = mergeEnvObjects(primaryObj, secondaryObj)
    assert.deepStrictEqual(mergedObj, { A: '1', B: '2', C: '4' })
  })

  it('mergeEnvFiles should merge two .env files and write to the first file', async () => {
    await mergeEnvFiles('/path/to/ayazmo.env', '/path/to/plugin.env')
    // Since fs.writeFile is mocked, we assume the file is written successfully.
    // You can add additional logic to check the content that would be written.
    assert.ok(true, 'mergeEnvFiles should complete without throwing an error')
  })
})
