const parseIssue = str => {
  const match = str
    .trim()
    .match(/^(\d+);\s*(\d+)\((\d+)\)\:?\s*(\d+)(\-(\d+))?$/);
  if (!match) throw new Error('Invalid issue format: ' + str);
  let [, year, volume, issue, startPage, , endPage] = match.map(Number);
  if (startPage > endPage) {
    endPage = Number(
      String(startPage).slice(
        0,
        String(startPage).length - String(endPage).length
      ) + String(endPage)
    );
  }
  if (!endPage) endPage = startPage;
  return { year, volume, issue, pages: [startPage, endPage] };
};

export default parseIssue;
