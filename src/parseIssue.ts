import { type Issue } from './types.ts';

const parseIssue = (str: string) => {
  const trimmed = str.trim();

  // PII: date portion followed directly by ":" and article ID
  const piiMatch = trimmed.match(
    /^(?<year>\d{4})(?:\s+(?<month>[A-Za-z][A-Za-z-]*)(?:\s+(?<day>\d{1,2}))?)?:\s*(?<articleId>.+)$/
  );
  if (piiMatch?.groups) {
    const { year, month, day, articleId } = piiMatch.groups;
    return {
      year,
      month,
      day,
      volume: undefined,
      issue: undefined,
      pages: undefined,
      articleId
    };
  }

  const dateOnlyMatch = trimmed.match(
    /^(?<year>\d{4})(?:\s+(?<month>[A-Za-z][A-Za-z-]*)(?:\s+(?<day>\d{1,2}))?)?\.?$/
  );
  if (dateOnlyMatch?.groups) {
    const { year, month, day } = dateOnlyMatch.groups;
    return {
      year,
      month,
      day,
      volume: undefined,
      issue: undefined,
      pages: undefined,
      articleId: undefined
    };
  }

  const match = trimmed.match(
    /^(?<year>\d{4})(?:\s+(?<month>[A-Za-z][A-Za-z-]*)(?:\s+(?<day>\d{1,2}))?)?;\s*(?<volume>[A-Za-z0-9]+)(?:\((?<issue>[^)]+)\))?(?:(?::\s*|\s+)(?<pages>.+))?$/
  );
  if (!match?.groups) throw new Error('Invalid issue format: ' + str);

  let { year, month, day, volume, issue, pages } =
    match.groups as unknown as Issue;

  if (pages !== undefined) {
    const pageMatch = (pages as string).match(/^(\d+)(?:-(\d+))?$/);
    if (pageMatch) {
      const startPage = parseInt(pageMatch[1]);
      let endPage = pageMatch[2] ? parseInt(pageMatch[2]) : startPage;
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
  }

  return { year, month, day, volume, issue, pages, articleId: undefined };
};

export default parseIssue;
