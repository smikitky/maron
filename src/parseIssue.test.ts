import parseIssue from './parseIssue';

test('parse', () => {
  expect(parseIssue('2015 Aug;7(3): 107-15')).toStrictEqual({
    year: '2015',
    month: 'Aug',
    volume: '7',
    issue: '3',
    pages: [107, 115],
  });
  expect(parseIssue('1998;20(4):1024')).toStrictEqual({
    year: '1998',
    month: undefined,
    volume: '20',
    issue: '4',
    pages: [1024, 1024],
  });
  expect(parseIssue('1998; 7(5-7): g30572')).toStrictEqual({
    year: '1998',
    month: undefined,
    volume: '7',
    issue: '5-7',
    pages: 'g30572',
  });
});
