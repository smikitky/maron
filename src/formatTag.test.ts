import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import formatTag from './formatTag.ts';

describe('formatTag', () => {
  test('basic', () => {
    assert.equal(formatTag([1]), '1');
    assert.equal(formatTag([1, 2]), '1,2');
    assert.equal(formatTag([1, 2, 3]), '1-3');
    assert.equal(formatTag([1, 3, 4, 6, 7, 8]), '1,3,4,6-8');
  });

  test('duplicate', () => {
    assert.equal(formatTag([5, 5, 7, 8, 8]), '5,7,8');
  });

  test('unordered', () => {
    assert.equal(formatTag([3, 1, 5, 2, 4]), '1-5');
  });

  test('errors', () => {
    assert.throws(() => formatTag([0]), TypeError);
    assert.throws(() => formatTag([1.5]), TypeError);
    // @ts-expect-error
    assert.throws(() => formatTag('foo'), TypeError);
  });
});
