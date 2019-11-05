const esmRequire = require('esm')(module);
const MarkdownIt = require('markdown-it');
const replaceBacktick = esmRequire('./replaceBacktick').default;
const defaultStyle = esmRequire('./defaultStyle').default;

describe('replaceBacktick', () => {
  let md;

  beforeEach(() => {
    const mockReporter = {};
    ['log', 'info', 'warn', 'error', 'output', 'section'].forEach(
      m => (mockReporter[m] = jest.fn())
    );
    const backticks = replaceBacktick();
    md = MarkdownIt().use(backticks.register);
    backticks.reset(
      {
        references: { shimamura: { title: 'smiling ', doi: 'doi/1' } },
        refTagMap: new Map(),
        figures: { shibuya: { caption: 'flower' } },
        figTagMap: new Map(),
        styles: defaultStyle
      },
      mockReporter
    );
  });

  test('ref', () => {
    const html = md.render('Hi `ref:shimamura`.');
    expect(html).toContain('[<span class="ref">1</span>]');

    expect(() => {
      md.render('Hi `ref:notfound`');
    }).toThrow('Unknown reference tag');
  });

  test('fig', () => {
    const html = md.render('fig `fig:shibuya`');
    expect(html).toContain('<span class="fig">1</span>');

    expect(() => {
      md.render('Hi `fig:notfound`');
    }).toThrow('Unknown figure tag');
  });

  test('references', () => {
    const html = md.render('`ref:shimamura` `references`');
    expect(html).toContain('<ol class="references">');
    expect(html).toContain('<li id="ref-1" data-doi="doi/1" value="1">');
  });

  test('figures', () => {
    const html = md.render('`fig:shibuya` `figures`');
    expect(html).toContain('<figure id="fig-1">');
  });
});
