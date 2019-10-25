const esmRequire = require('esm')(module);
const formatTag = esmRequire('./formatTag').default;

test('basic', () => {
  expect(formatTag([1])).toBe('1');
  expect(formatTag([1, 2])).toBe('1,2');
  expect(formatTag([1, 2, 3])).toBe('1-3');
  expect(formatTag([1, 3, 4, 6, 7, 8])).toBe('1,3,4,6-8');
});

test('duplicate', () => {
  expect(formatTag([5, 5, 7, 8, 8])).toBe('5,7,8');
});

test('unordered', () => {
  expect(formatTag([3, 1, 5, 2, 4])).toBe('1-5');
});

test('errors', () => {
  expect(() => formatTag([0])).toThrow(TypeError);
  expect(() => formatTag([1.5])).toThrow(TypeError);
  expect(() => formatTag('foo')).toThrow(TypeError);
});
