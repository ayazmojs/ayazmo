import { it, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeProvider, getAuthProviderFunction, mapAuthProviders } from '@ayazmo/utils';
import buildApp from '../__fixtures__/build-app.js';

describe('auth utils', () => {

  let app;

  before(async () => {
    app = buildApp();
    app.decorate('SSO', async (request, reply) => {
      reply.code(200).send({ message: 'Anonymous request' });
    });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it('sanitizeProvider should validate providers correctly', async () => {
    assert.strictEqual(sanitizeProvider('provider'), true);
    assert.strictEqual(sanitizeProvider(['provider1', 'provider2']), true);
    assert.strictEqual(sanitizeProvider(['provider', 123]), false);
    assert.strictEqual(sanitizeProvider(123), false);
    assert.strictEqual(sanitizeProvider(null), false);
    assert.strictEqual(sanitizeProvider(), false);
  });

  it('getAuthProviderFunction should return the correct function', () => {
    const authProviderFunction = getAuthProviderFunction(app, 'SSO');
    assert.strictEqual(typeof authProviderFunction, 'function');
  });

  it('mapAuthProviders should return the correct function', () => {
    const authProviderFunction = mapAuthProviders(app, ['SSO']);
    assert.strictEqual(typeof authProviderFunction[0], 'function');
  });
});