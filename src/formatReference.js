import Handlebars from 'handlebars';
import capitalizeTitle from 'capitalize-title';

export const authorList = (text, { max = 3, etal = ' et al' } = {}) => {
  const list = text
    .replace(/\s+et al\.$/, '')
    .split(/,/)
    .map(s => s.trim());
  if (list.length > max) {
    return list.slice(0, max).join(', ') + etal;
  } else {
    return list.join(', ');
  }
};

Handlebars.registerHelper('authorList', (text, { hash }) =>
  authorList(text, hash)
);

export const formatPages = (
  [start, end],
  { compact = false, delim = '-' } = {}
) => {
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
};

Handlebars.registerHelper('pages', (text, { hash }) => formatPages(text, hash));

Handlebars.registerHelper('capitalize', capitalizeTitle);

const formatReference = (refData, style) => {
  const template = Handlebars.compile(style);
  return template(refData);
};

export default formatReference;
