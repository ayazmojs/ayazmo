import { isNonEmptyString } from '@ayazmo/utils';
import * as assert from 'assert';
import { describe, it } from 'node:test';

describe('isNonEmptyString', () => {
  it('should return true for non-empty strings', () => {
    assert.strictEqual(isNonEmptyString('hello'), true);
  });

  it('should return false for empty strings', () => {
    assert.strictEqual(isNonEmptyString(''), false);
  });

  it('should return false for strings with only whitespace', () => {
    assert.strictEqual(isNonEmptyString('   '), false);
  });

  it('should return false for non-string values', () => {
    assert.strictEqual(isNonEmptyString(123), false);
    assert.strictEqual(isNonEmptyString(null), false);
    assert.strictEqual(isNonEmptyString(undefined), false);
    assert.strictEqual(isNonEmptyString({}), false);
    assert.strictEqual(isNonEmptyString([]), false);
  });
});