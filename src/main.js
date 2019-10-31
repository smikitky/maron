import fs from 'fs-extra';
import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import path from 'path';
import url from 'url'; // Node >= 10.12 required
import glob from 'glob-promise';
import chokidar from 'chokidar';
import dashdash from 'dashdash';
import yaml from 'js-yaml';
import escape from 'escape-html';
import _ from 'lodash';

import formatReference from './formatReference';
import formatTag from './formatTag';
import parseIssue from './parseIssue';
import parseAuthors from './parseAuthors';
import convertImage from './convertImage';
import createReporter from './reporter';
import readFileIfExists from './readFileIfExists';

const md = MarkdownIt({ html: true }).use(attrs);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const replaceReferences = (ctx, reporter) => {
  const { sourceFile, references, style, figures, options } = ctx;
  let refCounter = 1;
  const refTagMap = new Map();
  let figCounter = 1;
  const figTagMap = new Map();

  const refReplacer = (_, tags) => {
    const refs = tags.split(',');
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
    const formattedTag = formatTag(indexes);
    const linked = formattedTag.replace(/(\d+)/g, (_, index) => {
      const tag = Array.from(refTagMap.entries()).find(
        ([t, i]) => i === Number(index)
      )[0];
      const ref = references[tag];
      return options.no_link
        ? `${index}`
        : `<a href="#ref-${index}" title="${escape(ref.title)}">${index}</a>`;
    });
    return '[' + linked + ']';
  };

  const figReplacer = (_, tag) => {
    const figure = figures[tag];
    if (!figure) throw new Error('Unknown figure tag: ' + tag);
    const index = figTagMap.has(tag)
      ? figTagMap.get(tag)
      : (() => {
          const index = figCounter++;
          figTagMap.set(tag, index);
          reporter.info(`figure #${index} = ${tag}`);
          return index;
        })();
    return options.no_link
      ? `${index}`
      : `<a href="#fig-${index}" title="${tag}">${index}</a>`;
  };

  const referencesList = () => {
    const items = Object.keys(references)
      .sort((a, b) => refTagMap.get(a) - refTagMap.get(b))
      .map(k => {
        const item = references[k];
        const index = refTagMap.get(k);
        const formatted = formatReference(item, style);
        return `  <li id="ref-${index}" value="${index}">${formatted}</li>`;
      })
      .join('\n');
    return `<ol>\n${items}\n</ol>`;
  };

  const figuresList = () => {
    const items = Object.keys(figures)
      .sort((a, b) => figTagMap.get(a) - figTagMap.get(b))
      .map(tag => {
        const index = figTagMap.get(tag);
        if (typeof index !== 'number') {
          reporter.warn('Unused figure: ' + tag);
          return;
        }
        const figure = figures[tag];
        return (
          `<figure id="fig-${index}">\n` +
          `  <img src="fig-${index}.png" />\n` +
          `  <figcaption><b>Figure ${index}</b> ${figure.caption}</figcaption>\n` +
          `</figure>`
        );
      });
    return items.join('\n');
  };

  const result = sourceFile
    .replace(/`ref:(.+?)`/g, refReplacer)
    .replace(/`fig:(.+?)`/g, figReplacer)
    .replace(/`references`/g, referencesList)
    .replace(/`figures`/g, figuresList);

  ctx.figTagMap = figTagMap;
  return result;
};

const toHtml = async (ctx, reporter) => {
  reporter.section('Generating HTML...');
  const html = md.render(ctx.processedMd);
  const withHeaders = `<!doctype html><html><head><link rel='stylesheet' href='style.css'></head><body>${html}</body></html>`;
  await fs.writeFile('out/index.html', withHeaders, 'utf8');
  reporter.output('out/index.html');

  const defaultCss = await fs.readFile(
    path.join(__dirname, 'style.css'),
    'utf8'
  );
  const customCss = await readFileIfExists(
    path.join(ctx.sourceDir, 'style.css')
  );
  if (customCss) {
    reporter.log('Loaded custom style.css.');
  } else {
    reporter.info('Custom style.css not found.');
  }

  const cssFile = path.join('out', 'style.css');
  await fs.writeFile(cssFile, defaultCss + '\n\n' + customCss);
  reporter.output(cssFile);
};

const parseReferences = data => {
  const parseReference = ref => {
    return {
      ...ref,
      authors:
        typeof ref.authors === 'string'
          ? parseAuthors(ref.authors)
          : ref.authors,
      issue: typeof ref.issue === 'string' ? parseIssue(ref.issue) : ref.issue
    };
  };

  return {
    ...data,
    references: _.mapValues(data.references, parseReference)
  };
};

const addReferences = async (ctx, reporter) => {
  reporter.section('Processing References...');
  const result = replaceReferences(ctx, reporter);

  await fs.ensureDir('./out');
  const mdFile = path.join('out', 'index.md');
  await fs.writeFile(mdFile, result, 'utf8');
  reporter.output(mdFile);
  ctx.processedMd = result;
};

const convertImages = async (ctx, reporter) => {
  const { sourceDir, figures, figTagMap } = ctx;
  reporter.section('Converting Images...');
  for (const [tag, index] of figTagMap.entries()) {
    const figure = figures[tag];
    const files = await glob(path.resolve(sourceDir, tag + '.{jpg,png,pdf}'));
    if (files.length === 0) {
      throw new Error(`Figure "${figure.tag}" not found.`);
    }
    if (files.length > 1) {
      throw new Error(`Figure "${figure.tag}" matched two or more file names.`);
    }
    const inFile = files[0];

    reporter.info(`fig #${index} => ${path.relative(sourceDir, inFile)}`);

    const tiffOut = path.join('./out', `fig-${index}.tiff`);
    await convertImage(inFile, tiffOut, { resolution: figure.resolution });
    reporter.output(tiffOut);

    const pngOut = path.join('./out', `fig-${index}.png`);
    await convertImage(inFile, pngOut, { resolution: 72 });
    reporter.output(pngOut);
  }
  reporter.log(`Converted ${figTagMap.size} source image(s).`);
};

/**
 * Load source files into memory.
 * @param {string} sourceDir
 * @param {object} options
 * @param {ReturnType<createReporter>} reporter
 */
const createContext = async (sourceDir, options, reporter) => {
  reporter.section('Loading Source files...');
  const sourceFileName = path.join(sourceDir, 'index.md');
  const sourceFile = await readFileIfExists(sourceFileName);
  if (!sourceFile) throw new Error('Source file not found.');

  let references = {};
  let style = '{{authors}} {{title}}';
  const referencesFileName = path.join(sourceDir, 'references.yaml');
  const referencesFile = await readFileIfExists(referencesFileName);
  if (!referencesFile) {
    reporter.warn('references.yaml not found.');
  } else {
    ({ references, style } = parseReferences(yaml.load(referencesFile)));
    reporter.log(`Loaded ${Object.keys(references).length} reference items.`);
  }

  let figures = [];
  const figuresFileName = path.join(sourceDir, 'figures.yaml');
  const figuresFile = await readFileIfExists(figuresFileName);
  if (!figuresFile) {
    reporter.warn('figures.yaml not found.');
  } else {
    figures = yaml.load(figuresFile);
    reporter.log(`Loaded ${Object.keys(figures).length} figure items.`);
  }

  return { sourceDir, sourceFile, references, style, figures, options };
};

const main = async () => {
  const sourceDir = './src';

  const parser = dashdash.createParser({
    options: [
      { names: ['watch', 'w'], type: 'bool', help: 'Watch source files' },
      { names: ['verbose', 'v'], type: 'bool', help: 'Print more info' },
      { names: ['no-link', 'n'], type: 'bool', help: 'Disable links' },
      { names: ['help', 'h'], type: 'bool', help: 'Prints this message' },
      { names: ['clear', 'c'], type: 'bool', help: 'Clear console on re-run' }
    ]
  });

  const help = () => {
    console.log('ron - Markdown utility for academic writing\n');
    console.log('Usage: npx ron [options]');
    console.log(parser.help());
  };

  let options;
  try {
    options = parser.parse(process.argv);
  } catch (err) {
    console.error(err.message);
    help();
    process.exit(1);
  }

  if (options.help) {
    help();
    process.exit(0);
  }

  const reporter = createReporter(options.verbose);

  const run = async () => {
    try {
      const ctx = await createContext(sourceDir, options, reporter);
      await addReferences(ctx, reporter);
      await convertImages(ctx, reporter);
      await toHtml(ctx, reporter);
    } catch (err) {
      reporter.error(err);
    }
  };

  await run();

  if (options.watch) {
    let recompiling = false;
    console.log('Watching source and reference files...');
    const handler = _.debounce(() => {
      if (recompiling) return;
      recompiling = true;
      if (options.clear) console.clear();
      console.log('Recompiling...');
      run().then(() => (recompiling = false));
    }, 300);
    chokidar.watch('./src').on('change', handler);
  }
};

main();
