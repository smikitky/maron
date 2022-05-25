import _ from 'lodash';
import { Issue } from './types';

const parseIssue = (str: string) => {
  const match = str
    .trim()
    .match(
      /^(?<year>\d+)(\s+(?<month>[A-Za-z]+))?;\s*(?<volume>\d+)\((?<issue>(\d|\-)+)\)((\:\s*|\s+)(?<pages>.+))?$/
    );
  if (!match) throw new Error('Invalid issue format: ' + str);
  let { year, month, volume, issue, pages } = match.groups! as unknown as Issue;

  const pageMatch = (pages as string).match(/^(\d+)(-(\d+))?$/);
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
