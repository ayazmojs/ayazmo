import { test } from 'node:test'
import assert from 'node:assert'
import { AyazmoError } from '@ayazmo/utils'

test('AyazmoError should create an error with the given message and statusCode', () => {
  const message = 'Test error message'
  const statusCode = 400
  const error = AyazmoError({ statusCode, message })

  assert.strictEqual(error.message, message, 'Error message should match the input message')
  assert.strictEqual(error.statusCode, statusCode, 'Error statusCode should match the input statusCode')
})

test('AyazmoError should default to AYAZMO_ERROR code when no code is provided', () => {
  const error = AyazmoError({ statusCode: 400, message: 'Test error message' })

  assert.strictEqual(error.code, 'AYAZMO_ERROR', 'Error code should default to AYAZMO_ERROR')
})

test('AyazmoError should use the provided error code', () => {
  const errorCode = 'CUSTOM_CODE'
  const error = AyazmoError({ statusCode: 400, message: 'Test error message', code: errorCode })

  assert.strictEqual(error.code, errorCode, 'Error code should match the provided error code')
})
