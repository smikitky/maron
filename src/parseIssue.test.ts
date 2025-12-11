import assert from 'node:assert/strict';
import { test } from 'node:test';

import parseIssue from './parseIssue.ts';

test('basic', () => {
  assert.deepStrictEqual(parseIssue('1998;7(5):123-130'), {
    year: '1998',
    month: undefined,
    day: undefined,
    volume: '7',
    issue: '5',
    pages: [123, 130],
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2001;12:55-60'), {
    year: '2001',
    month: undefined,
    day: undefined,
    volume: '12',
    issue: undefined,
    pages: [55, 60],
    articleId: undefined
  });

  // single-page
  assert.deepStrictEqual(parseIssue('2021;10(1):20'), {
    year: '2021',
    month: undefined,
    day: undefined,
    volume: '10',
    issue: '1',
    pages: [20, 20],
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2010;43'), {
    year: '2010',
    month: undefined,
    day: undefined,
    volume: '43',
    issue: undefined,
    pages: undefined,
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2020 Mar;15(3):200-210'), {
    year: '2020',
    month: 'Mar',
    day: undefined,
    volume: '15',
    issue: '3',
    pages: [200, 210],
    articleId: undefined
  });

  // Tricky "month" name
  assert.deepStrictEqual(parseIssue('2005 Spring;20(1):5-10'), {
    year: '2005',
    month: 'Spring',
    day: undefined,
    volume: '20',
    issue: '1',
    pages: [5, 10],
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2000 Oct-Dec;15(4):100-110'), {
    year: '2000',
    month: 'Oct-Dec',
    day: undefined,
    volume: '15',
    issue: '4',
    pages: [100, 110],
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2015 Jun;9:99-105'), {
    year: '2015',
    month: 'Jun',
    day: undefined,
    volume: '9',
    issue: undefined,
    pages: [99, 105],
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2023 Aug 5;32(1):e1234'), {
    year: '2023',
    month: 'Aug',
    day: '5',
    volume: '32',
    issue: '1',
    pages: 'e1234',
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2022 Nov 11;8:101-110'), {
    year: '2022',
    month: 'Nov',
    day: '11',
    volume: '8',
    issue: undefined,
    pages: [101, 110],
    articleId: undefined
  });

  // Ahead-of-print with date only
  assert.deepStrictEqual(parseIssue('2025 Sep 12'), {
    year: '2025',
    month: 'Sep',
    day: '12',
    volume: undefined,
    issue: undefined,
    pages: undefined,
    articleId: undefined
  });

  // Tricky issue
  assert.deepStrictEqual(parseIssue('1998;7(5-7):g30572'), {
    year: '1998',
    month: undefined,
    day: undefined,
    volume: '7',
    issue: '5-7',
    pages: 'g30572',
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2010;30(Suppl 1):25-30'), {
    year: '2010',
    month: undefined,
    day: undefined,
    volume: '30',
    issue: 'Suppl 1',
    pages: [25, 30],
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2017;21(4):e5541'), {
    year: '2017',
    month: undefined,
    day: undefined,
    volume: '21',
    issue: '4',
    pages: 'e5541',
    articleId: undefined
  });

  assert.deepStrictEqual(parseIssue('2019;10(2):L23-L29'), {
    year: '2019',
    month: undefined,
    day: undefined,
    volume: '10',
    issue: '2',
    pages: 'L23-L29',
    articleId: undefined
  });

  // Tricky volume name
  assert.deepStrictEqual(parseIssue('2012;Suppl1(3):123-130'), {
    year: '2012',
    month: undefined,
    day: undefined,
    volume: 'Suppl1',
    issue: '3',
    pages: [123, 130],
    articleId: undefined
  });
});

// PII 系（DATE の後が ":"）
test('article ID (PII)', () => {
  assert.deepStrictEqual(parseIssue('2025:S1076-6332(25)01037-2'), {
    year: '2025',
    month: undefined,
    day: undefined,
    volume: undefined,
    issue: undefined,
    pages: undefined,
    articleId: 'S1076-6332(25)01037-2'
  });

  assert.deepStrictEqual(parseIssue('2024 Apr:S0002-9297(23)00045-1'), {
    year: '2024',
    month: 'Apr',
    day: undefined,
    volume: undefined,
    issue: undefined,
    pages: undefined,
    articleId: 'S0002-9297(23)00045-1'
  });

  assert.deepStrictEqual(parseIssue('2025 Nov 28:S1076-6332(25)01037-2'), {
    year: '2025',
    month: 'Nov',
    day: '28',
    volume: undefined,
    issue: undefined,
    pages: undefined,
    articleId: 'S1076-6332(25)01037-2'
  });
});
