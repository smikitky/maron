import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import parseIssue from './parseIssue.ts';

describe('parseIssue', () => {
  test('parse', () => {
    assert.deepStrictEqual(parseIssue('2015 Aug;7(3): 107-15'), {
      year: '2015',
      month: 'Aug',
      volume: '7',
      issue: '3',
      pages: [107, 115]
    });
    assert.deepStrictEqual(parseIssue('1998;20(4):1024'), {
      year: '1998',
      month: undefined,
      volume: '20',
      issue: '4',
      pages: [1024, 1024]
    });
    assert.deepStrictEqual(parseIssue('1998; 7(5-7): g30572'), {
      year: '1998',
      month: undefined,
      volume: '7',
      issue: '5-7',
      pages: 'g30572'
    });
  });
});
