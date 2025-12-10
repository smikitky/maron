import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import parseAuthors from './parseAuthors.ts';

describe('parseAuthors', () => {
  test('basic', () => {
    assert.deepEqual(parseAuthors('J Doe, T Yamada'), ['J Doe', 'T Yamada']);
    assert.deepEqual(parseAuthors('J Doe, T Yamada, et al'), [
      'J Doe',
      'T Yamada',
      'ET_AL'
    ]);
  });
});
