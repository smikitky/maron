import Handlebars from 'handlebars';
import capitalizeTitle from 'capitalize-title';

export const authorList = (
  authors,
  { max = 3, truncateTo, delimiter = ', ', etal = ' et al' } = {}
) => {
  const hasEtAl = authors[authors.length - 1] === 'ET_AL';
  if (typeof truncateTo === 'undefined') truncateTo = max;
  if (hasEtAl) authors = authors.slice(0, authors.length - 1);
  if (authors.length > max) {
    return authors.slice(0, truncateTo).join(', ') + etal;
  } else {
    return authors.join(delimiter);
  }
};

Handlebars.registerHelper('authorList', (text, { hash }) =>
  authorList(text, hash)
);

export const formatPages = (pages, { compact = false, delim = '-' } = {}) => {
  if (!Array.isArray(pages)) {
    return pages;
  } else {
    const [start, end] = pages;
    if (start === end) return `${start}`;
    if (compact) {
      const sstart = String(start);
      const send = String(end);
      if (sstart.length !== send.length) return `${start}${delim}${end}`;
      for (let i = 0; i < send.length; i++) {
        if (sstart[i] !== send[i]) {
          return `${start}${delim}${send.slice(i)}`;
        }
      }
    } else {
      return `${start}${delim}${end}`;
    }
  }
};

Handlebars.registerHelper('pages', (text, { hash }) => formatPages(text, hash));

Handlebars.registerHelper('capitalize', capitalizeTitle);

const formatReference = (refData, style) => {
  const template = Handlebars.compile(style);
  return template(refData);
};

export default formatReference;
