const esmRequire = require('esm')(module);
const { authorList, formatPages } = esmRequire('./formatReference');

describe('authorList', () => {
  test('basic', () => {
    expect(authorList(['J Doe', 'A Smith'])).toBe('J Doe, A Smith');
    expect(authorList(['J Doe', 'A Smith'], { max: 1 })).toBe('J Doe et al');
    expect(authorList(['J Doe', 'A Smith'], { max: 2 })).toBe('J Doe, A Smith');
  });
});

describe('formatPages', () => {
  test('basic', () => {
    expect(formatPages([1, 10])).toBe('1-10');
    expect(formatPages([1, 10], { compact: true })).toBe('1-10');
    expect(formatPages([15, 25], { compact: true })).toBe('15-25');
    expect(formatPages([100, 110], { compact: true })).toBe('100-10');
    expect(formatPages([980, 1001], { compact: true })).toBe('980-1001');
  });
});
