import MarkdownIt from 'markdown-it';
import replaceBacktick from './replaceBacktick.js';
import defaultStyle from './defaultStyle.js';
import cheerio from 'cheerio';

describe('replaceBacktick', () => {
  let md: MarkdownIt;

  beforeEach(() => {
    const mockReporter: any = {};
    ['log', 'info', 'warn', 'error', 'output', 'section'].forEach(
      m => (mockReporter[m] = jest.fn())
    );
    const backticks = replaceBacktick();
    md = MarkdownIt().use(backticks.register);
    backticks.reset(
      {
        references: {
          shimamura: { title: 'smiling ', doi: 'doi/1' },
          honda: { title: 'stars', doi: 'doi/2' }
        },
        refTagMap: new Map(),
        figures: { shibuya: { caption: 'flower' } },
        figTagMap: new Map(),
        styles: defaultStyle
      } as any,
      mockReporter
    );
  });

  test('ref', () => {
    const $1 = cheerio.load(md.render('Hi `ref:shimamura`.'));
    expect($1('span.ref')).toHaveLength(1);

    const $2 = cheerio.load(md.render('Hi `ref:honda,shimamura`.'));
    expect($2('span.ref')).toHaveLength(2);

    expect(() => {
      md.render('Hi `ref:notfound`');
    }).toThrow('Unknown reference tag');
  });

  test('fig', () => {
    const $ = cheerio.load(md.render('fig `fig:shibuya`'));
    expect($('span.fig:contains("1")')).toHaveLength(1);

    expect(() => {
      md.render('Hi `fig:notfound`');
    }).toThrow('Unknown figure tag');
  });

  test('references', () => {
    const $ = cheerio.load(md.render('`ref:honda,shimamura` `references`'));
    expect($('ol.references')).toHaveLength(1);
    expect($('li[id^="ref"]')).toHaveLength(2);
    expect($('li:nth-child(1)').text()).toContain('stars');
    expect($('li:nth-child(2)').text()).toContain('smiling');
  });

  test('figures', () => {
    const $ = cheerio.load(md.render('`fig:shibuya` `figures`'));
    expect($('figure#fig-1')).toHaveLength(1);
  });
});
