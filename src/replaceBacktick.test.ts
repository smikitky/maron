import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import MarkdownIt from 'markdown-it';
import * as cheerio from 'cheerio';

import defaultStyle from './defaultStyle.ts';
import replaceBacktick from './replaceBacktick.ts';

const createMockReporter = () => {
  const methods = ['log', 'info', 'warn', 'error', 'output', 'section'] as const;
  const reporter: any = {};
  methods.forEach(m => {
    reporter[m] = () => {};
  });
  return reporter;
};

describe('replaceBacktick', () => {
  let md: MarkdownIt;

  beforeEach(() => {
    const mockReporter = createMockReporter();
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
    assert.equal($1('span.ref').length, 1);

    const $2 = cheerio.load(md.render('Hi `ref:honda,shimamura`.'));
    assert.equal($2('span.ref').length, 2);

    assert.throws(() => {
      md.render('Hi `ref:notfound`');
    }, /Unknown reference tag/);
  });

  test('fig', () => {
    const $ = cheerio.load(md.render('fig `fig:shibuya`'));
    assert.equal($('span.fig:contains("1")').length, 1);

    assert.throws(() => {
      md.render('Hi `fig:notfound`');
    }, /Unknown figure tag/);
  });

  test('references', () => {
    const $ = cheerio.load(md.render('`ref:honda,shimamura` `references`'));
    assert.equal($('ol.references').length, 1);
    assert.equal($('li[id^="ref"]').length, 2);
    assert.match($('li:nth-child(1)').text(), /stars/);
    assert.match($('li:nth-child(2)').text(), /smiling/);
  });

  test('figures', () => {
    const $ = cheerio.load(md.render('`fig:shibuya` `figures`'));
    assert.equal($('figure#fig-1').length, 1);
  });
});
