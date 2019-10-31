import _ from 'lodash';

const parseIssue = str => {
  const match = str
    .trim()
    .match(
      /^(?<year>\d+)(\s+(?<month>[A-Za-z]+))?;\s*(?<volume>\d+)\((?<issue>\d+)\)(\:\s*|\s+)(?<startPage>\d+)(\-(?<endPage>\d+))?$/
    );
  if (!match) throw new Error('Invalid issue format: ' + str);
  let { year, volume, issue, startPage, endPage } = _.mapValues(
    match.groups,
    v => Number(v)
  );
  const { month } = match.groups;
  if (startPage > endPage) {
    endPage = Number(
      String(startPage).slice(
        0,
        String(startPage).length - String(endPage).length
      ) + String(endPage)
    );
  }
  if (!endPage) endPage = startPage;
  return { year, month, volume, issue, pages: [startPage, endPage] };
};

export default parseIssue;
