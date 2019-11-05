import _ from 'lodash';

const parseIssue = str => {
  const match = str
    .trim()
    .match(
      /^(?<year>\d+)(\s+(?<month>[A-Za-z]+))?;\s*(?<volume>\d+)\((?<issue>\d+)\)((\:\s*|\s+)(?<pages>.+))?$/
    );
  if (!match) throw new Error('Invalid issue format: ' + str);
  let { year, volume, issue } = _.mapValues(match.groups, v => Number(v));
  let { month, pages } = match.groups;

  const pageMatch = pages.match(/^(\d+)(-(\d+))?$/);
  if (pageMatch) {
    const startPage = parseInt(pageMatch[1]);
    let endPage = pageMatch[3] ? parseInt(pageMatch[3]) : startPage;
    if (startPage > endPage) {
      endPage = Number(
        String(startPage).slice(
          0,
          String(startPage).length - String(endPage).length
        ) + String(endPage)
      );
    }
    pages = [startPage, endPage];
  }
  return { year, month, volume, issue, pages };
};

export default parseIssue;
