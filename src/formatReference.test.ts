import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { authorList, formatPages } from './formatReference.ts';

describe('authorList', () => {
  test('basic', () => {
    assert.equal(authorList(['J Doe', 'A Smith']), 'J Doe, A Smith');
    assert.equal(authorList(['J Doe', 'A Smith'], { max: 1 }), 'J Doe et al');
    assert.equal(authorList(['J Doe', 'A Smith'], { max: 2 }), 'J Doe, A Smith');
    assert.equal(
      authorList(['J Doe', 'A Smith'], { max: 2, truncateTo: 1 }),
      'J Doe, A Smith'
    );
    assert.equal(
      authorList(['J Doe', 'A Smith', 'B White'], { max: 2, truncateTo: 1 }),
      'J Doe et al'
    );
  });
});

describe('formatPages', () => {
  test('basic', () => {
    assert.equal(formatPages([1, 10]), '1-10');
    assert.equal(formatPages([8, 8]), '8');
    assert.equal(formatPages([1, 10], { compact: true }), '1-10');
    assert.equal(formatPages([15, 25], { compact: true }), '15-25');
    assert.equal(formatPages([100, 110], { compact: true }), '100-10');
    assert.equal(formatPages([980, 1001], { compact: true }), '980-1001');
    assert.equal(formatPages('g1028', { compact: true }), 'g1028');
  });
});
