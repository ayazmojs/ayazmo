import { test } from 'node:test';
import assert from 'node:assert';
import { checkCommandExists } from '@ayazmo/utils';

test('checkCommandExists should return true for existing commands', async () => {
  const commandExists = await checkCommandExists('node');
  assert.strictEqual(commandExists, true);
});

test('checkCommandExists should return false for non-existing commands', async () => {
  const commandExists = await checkCommandExists('commandthatdoesnotexist');
  assert.strictEqual(commandExists, false);
});