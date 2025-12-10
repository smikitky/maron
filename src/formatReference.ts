import Handlebars from 'handlebars';
import capitalizeTitle from 'capitalize-title';
import { type ReferenceEntry } from './types.ts';

interface AuthorListOptions {
  max?: number;
  truncateTo?: number;
  delimiter?: string;
  etal?: string;
}

export const authorList = (
  authors: string[],
  options: AuthorListOptions = {}
) => {
  const { max = 3, truncateTo, delimiter = ', ', etal = ' et al' } = options;
  const hasEtAl = authors[authors.length - 1] === 'ET_AL';
  if (hasEtAl) authors = authors.slice(0, authors.length - 1);
  if (authors.length > max) {
    return authors.slice(0, truncateTo ?? max).join(', ') + etal;
  } else {
    return authors.join(delimiter);
  }
};

Handlebars.registerHelper('authorList', (text, { hash }) =>
  authorList(text, hash)
);

interface FormatPagesOptions {
  compact?: boolean;
  delim?: string;
}

/**
 * Converts [150, 159] to "150-9", etc.
 */
export const formatPages = (
  pages: string | [start: number, end: number],
  options: FormatPagesOptions = {}
) => {
  const { compact = false, delim = '-' } = options;
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
      return `${start}`;
    } else {
      return `${start}${delim}${end}`;
    }
  }
};

Handlebars.registerHelper('pages', (text, { hash }) => formatPages(text, hash));

Handlebars.registerHelper('capitalize', capitalizeTitle);

const formatReference = (refData: ReferenceEntry, style: string) => {
  const template = Handlebars.compile(style);
  return template(refData);
};

export default formatReference;
