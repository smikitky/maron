import _ from 'lodash';

/**
 * Does a conversion like `[1,3,4,6,7,8]` to `'1,3,4,6-8'`.
 * @param {number[]} arr The input array.
 */
const formatTag = arr => {
  let min = undefined,
    max = undefined,
    result = '';

  if (
    !Array.isArray(arr) ||
    arr.some(
      item => typeof item !== 'number' || item < 1 || Math.floor(item) !== item
    )
  ) {
    throw new TypeError('Input must be an array of positive integers');
  }
  arr = _.uniq(arr).sort((a, b) => a - b);

  const flush = () => {
    if (result) result += ',';
    result +=
      max > min + 1 ? min + '-' + max : max === min + 1 ? min + ',' + max : min;
    min = max = undefined;
  };

  for (const i of arr) {
    if (min === undefined) {
      min = max = i;
    } else if (i === max + 1) {
      max = i;
    } else {
      flush();
      min = max = i;
    }
  }
  flush();
  return result;
};

export default formatTag;
