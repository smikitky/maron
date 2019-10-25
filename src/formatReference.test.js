const esmRequire = require('esm')(module);
const { formatPages } = esmRequire('./formatReference');

test('formatPages', () => {
  expect(formatPages([1, 10])).toBe('1-10');
  expect(formatPages([1, 10], { compact: true })).toBe('1-10');
  expect(formatPages([15, 25])).toBe('15-25');
  expect(formatPages([15, 25], { compact: true })).toBe('15-25');
  expect(formatPages([100, 110])).toBe('100-110');
  expect(formatPages([100, 110], { compact: true })).toBe('100-10');
});
