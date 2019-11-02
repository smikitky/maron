import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import path from 'path';
import url from 'url'; // Node >= 10.12 required
import fs from 'fs-extra';
import glob from 'glob-promise';
import yaml from 'js-yaml';
import _ from 'lodash';
import Handlebars from 'handlebars';
import escape from 'escape-html';
import extend from 'extend';

import createReporter from './reporter';
import formatReference from './formatReference';
import formatTag from './formatTag';
import parseIssue from './parseIssue';
import parseAuthors from './parseAuthors';
import convertImage from './convertImage';
import readFileIfExists from './readFileIfExists';
import defaultStyle from './defaultStyle';

const md = MarkdownIt({ html: true }).use(attrs);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const replaceReferences = (ctx, reporter) => {
  const { sourceFile, references, styles, figures } = ctx;
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
    return (
      '[' +
      formatTag(indexes, styles.citation).replace(
        /(\d+)/g,
        '<span class="ref">$1</span>'
      ) +
      ']'
    );
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
    return `<span class="fig">${index}</span>`;
  };

  const referencesList = () => {
    const items = Object.keys(references)
      .filter(r => refTagMap.has(r))
      .sort((a, b) => refTagMap.get(a) - refTagMap.get(b))
      .map(k => {
        const item = references[k];
        const index = refTagMap.get(k);
        const formatted = formatReference(item, styles.reference.format).trim();
        return `  <li id="ref-${index}" data-doi="${escape(
          item.doi || ''
        )}" value="${index}">${formatted}</li>`;
      })
      .join('\n');
    return `<ol class="references">\n${items}\n</ol>`;
  };

  const figuresList = () => {
    const items = Object.keys(figures)
      .filter(f => figTagMap.has(f))
      .sort((a, b) => figTagMap.get(a) - figTagMap.get(b))
      .map(tag => {
        const index = figTagMap.get(tag);
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

  const unusedRefs = Object.keys(references).filter(r => !refTagMap.has(r));
  if (unusedRefs.length) {
    reporter.warn('Unused references: ' + unusedRefs.join(', '));
  }
  const unusedFigs = Object.keys(figures).filter(f => !figTagMap.has(f));
  if (unusedFigs.length) {
    reporter.warn('Unused figures: ' + unusedFigs.join(', '));
  }

  ctx.figTagMap = figTagMap;
  return result;
};

const toHtml = async (ctx, reporter) => {
  const { sourceDir, outDir } = ctx;
  reporter.section('Generating HTML...');
  const html = md.render(ctx.processedMd);
  const template = await fs.readFile(
    path.join(__dirname, 'template.html'),
    'utf8'
  );
  const result = Handlebars.compile(template)({
    html,
    useLink: !ctx.options.no_link
  });
  await fs.writeFile(path.join(outDir, 'index.html'), result, 'utf8');
  reporter.output('index.html');

  const defaultCss = await fs.readFile(
    path.join(__dirname, 'style.css'),
    'utf8'
  );
  const customCss = await readFileIfExists(path.join(sourceDir, 'style.css'));
  if (customCss) {
    reporter.log('Loaded custom style.css.');
  } else {
    reporter.info('Custom style.css not found.');
  }

  const cssFile = path.join(outDir, 'style.css');
  await fs.writeFile(cssFile, defaultCss + '\n\n' + customCss);
  reporter.output('style.css');
};

const addReferences = async (ctx, reporter) => {
  const { outDir } = ctx;
  reporter.section('Processing References...');
  const result = replaceReferences(ctx, reporter);
  await fs.writeFile(path.join(outDir, 'index.md'), result, 'utf8');
  reporter.output('index.md');
  ctx.processedMd = result;
};

const convertImages = async (ctx, reporter) => {
  const { sourceDir, outDir, figures, figTagMap } = ctx;
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

    const tiffOut = `fig-${index}.tiff`;
    await convertImage(inFile, path.join(outDir, tiffOut), {
      resolution: figure.resolution
    });
    reporter.output(tiffOut);

    const pngOut = `fig-${index}.png`;
    await convertImage(inFile, path.join(outDir, pngOut), { resolution: 72 });
    reporter.output(pngOut);
  }
  reporter.log(`Converted ${figTagMap.size} source image(s).`);
};

const parseReference = ref => {
  return {
    ...ref,
    authors:
      typeof ref.authors === 'string' ? parseAuthors(ref.authors) : ref.authors,
    issue: typeof ref.issue === 'string' ? parseIssue(ref.issue) : ref.issue
  };
};

/**
 * Load source files into memory.
 * @param {string} sourceDir
 * @param {object} options
 * @param {ReturnType<createReporter>} reporter
 */
const createContext = async (sourceDir, outDir, options, reporter) => {
  reporter.section('Loading Source Files...');
  const sourceFileName = path.join(sourceDir, 'index.md');
  const sourceFile = await readFileIfExists(sourceFileName);
  if (!sourceFile) throw new Error('Source file not found.');

  const styleFileName = path.join(sourceDir, 'styles.yaml');
  const styleFile = await readFileIfExists(styleFileName);
  if (!styleFile) reporter.info('Style file not found. Using default styles.');
  const customStyles = yaml.load(styleFile || '{}');
  const styles = extend(true, defaultStyle, customStyles);

  let references = {};
  const referencesFileName = path.join(sourceDir, 'references.yaml');
  const referencesFile = await readFileIfExists(referencesFileName);
  if (!referencesFile) {
    reporter.warn('references.yaml not found.');
  } else {
    const data = yaml.load(referencesFile);
    if (typeof data !== 'object') {
      throw new Error('Root of references.yaml must be an object.');
    }
    references = _.mapValues(data, parseReference);
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

  return {
    sourceDir,
    outDir,
    sourceFile,
    references,
    styles,
    figures,
    options
  };
};

const run = async (sourceDir, outDir, options, reporter) => {
  try {
    await fs.ensureDir(outDir);
    const ctx = await createContext(sourceDir, outDir, options, reporter);
    await addReferences(ctx, reporter);
    await convertImages(ctx, reporter);
    await toHtml(ctx, reporter);
  } catch (err) {
    reporter.error(err.message);
  }
};

export default run;
