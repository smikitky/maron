import parseAuthors from './parseAuthors.js';

test('parseAuthors', () => {
  expect(parseAuthors('J Doe, T Yamada')).toEqual(['J Doe', 'T Yamada']);
  expect(parseAuthors('J Doe, T Yamada, et al')).toEqual([
    'J Doe',
    'T Yamada',
    'ET_AL'
  ]);
});
