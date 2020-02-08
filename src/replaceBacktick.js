import Handlebars from 'handlebars';
import formatReference from './formatReference';
import formatTag from './formatTag';
import cheerio from 'cheerio';

/**
 * Provides a custom markdown-it plug-in
 * for supporting custom backtick tags like `` `references` ``.
 * `register` is passed to `MarkdownIt.use()`.
 */
const replaceBacktick = () => {
  let ctx, reporter, refCounter, figCounter, tabCounter;

  const replace = (state, silent) => {
    if (state.src[state.pos] !== '`') return false;

    const regex = /^`((ref|fig|tab):([^`]+)|(references|figures|tables))`/;
    const match = state.src.slice(state.pos).match(regex);
    if (!match) return false;

    const [matched, , type1, tag, type2] = match;
    const type = type1 || type2;
    state.pos += matched.length;

    const addRawHtmlToken = html => {
      const token = state.push('html_inline', 'code', 0);
      token.markup = matched;
      token.content = html;
    };

    const {
      references,
      refTagMap,
      figures,
      figTagMap,
      tables,
      tabTagMap,
      styles
    } = ctx;

    const replaceRef = () => {
      const refs = tag.split(',');
      const indexes = [];
      refs.forEach(tag => {
        const reference = references[tag];
        if (!reference) throw new Error('Unknown reference tag: ' + tag);
        if (!refTagMap.has(tag)) {
          const refIndex = refCounter++;
          refTagMap.set(tag, refIndex);
          reporter.info(`ref #${refIndex} = ${tag}`);
        }
        if (indexes.indexOf(refTagMap.get(tag)) < 0)
          indexes.push(refTagMap.get(tag));
      });
      const html = Handlebars.compile(styles.citation.format)({
        items: formatTag(indexes, styles.citation).replace(
          /(\d+)/g,
          '<span class="ref">$1</span>'
        )
      });
      addRawHtmlToken(html);
    };

    const replaceFigOrTab = (list, map, name, className) => {
      const item = list[tag];
      if (!item) throw new Error(`Unknown ${name} tag: ` + tag);
      const index = map.has(tag)
        ? map.get(tag)
        : (() => {
            const index = name === 'figure' ? figCounter++ : tabCounter++;
            map.set(tag, index);
            reporter.info(`${name} #${index} = ${tag}`);
            return index;
          })();
      const $ = cheerio.load('');
      const span = $('<span>')
        .addClass(className)
        .text(index);
      addRawHtmlToken(span.toString());
    };

    const replaceFig = () => {
      replaceFigOrTab(figures, figTagMap, 'figure', 'fig');
    };

    const replaceTab = () => {
      replaceFigOrTab(tables, tabTagMap, 'table', 'tab');
    };

    const replaceReferences = () => {
      const $ = cheerio.load('');
      const ol = $('<ol>').addClass('references');
      Object.keys(references)
        .filter(r => refTagMap.has(r))
        .sort((a, b) => refTagMap.get(a) - refTagMap.get(b))
        .forEach(k => {
          const item = references[k];
          const index = refTagMap.get(k);
          const formatted = formatReference(
            item,
            styles.reference.format
          ).trim();
          $('<li>')
            .attr('id', `ref-${index}`)
            .data('doi', item.doi || '')
            .attr('value', index + '')
            .html(formatted)
            .appendTo(ol);
        });
      addRawHtmlToken(ol.toString());
    };

    const replaceFiguresOrTables = (
      list,
      map,
      name,
      className,
      tagToContent,
      style
    ) => {
      const $ = cheerio.load('');
      const div = $('<div>').addClass(`list-${name}`);
      Object.keys(list)
        .filter(f => map.has(f))
        .sort((a, b) => map.get(a) - map.get(b))
        .forEach(tag => {
          const index = map.get(tag);
          const item = list[tag];
          const content = tagToContent($, tag, index);
          const figure = $('<figure>').attr('id', `${className}-${index}`);
          const figcaption = $('<figcaption>').html(
            Handlebars.compile(style.format)({ index, caption: item.caption })
          );
          figure.append(content);
          if (style.position === 'top') {
            figure.prepend(figcaption);
          } else if (style.position === 'bottom') {
            figure.append(figcaption);
          }
          div.append(figure);
        });
      addRawHtmlToken(div.toString());
    };

    const replaceFigures = () => {
      replaceFiguresOrTables(
        figures,
        figTagMap,
        'figure',
        'fig',
        ($, tag, index) => $('<img>').attr('src', `fig-${index}.png`),
        styles.figCaption
      );
    };

    const replaceTables = () => {
      replaceFiguresOrTables(
        tables,
        tabTagMap,
        'table',
        'tab',
        ($, tag, index) => tables[tag].content,
        styles.tabCaption
      );
    };

    ({
      ref: replaceRef,
      fig: replaceFig,
      tab: replaceTab,
      references: replaceReferences,
      figures: replaceFigures,
      tables: replaceTables
    }[type]());
    return true;
  };

  const register = md => {
    // Inserted before markdown's default backtick parser
    md.inline.ruler.before('backticks', 'replaceref', replace);
  };

  const reset = (theContext, theReporter) => {
    ctx = theContext;
    reporter = theReporter;
    refCounter = 1;
    figCounter = 1;
    tabCounter = 1;
  };

  return { reset, register };
};

export default replaceBacktick;
