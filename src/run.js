import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import namedHeadings from 'markdown-it-named-headings';
import replaceBacktick from './replaceBacktick';
import path from 'path';
import url from 'url'; // Node >= 10.12 required
import fs from 'fs-extra';
import glob from 'glob-promise';
import yaml from 'js-yaml';
import _ from 'lodash';
import Handlebars from 'handlebars';
import extend from 'extend';

import createReporter from './reporter';
import parseIssue from './parseIssue';
import parseAuthors from './parseAuthors';
import convertImage from './convertImage';
import readFileIfExists from './readFileIfExists';
import defaultStyle from './defaultStyle';

const backticks = replaceBacktick();
const md = MarkdownIt({ html: true })
  .use(attrs)
  .use(namedHeadings)
  .use(backticks.register);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const generateHtml = async (ctx, reporter) => {
  const { sourceFile, outDir, references, refTagMap, figures, figTagMap } = ctx;
  reporter.section('Generating HTML...');
  backticks.reset(ctx, reporter);
  const html = md.render(sourceFile);
  const template = await fs.readFile(
    path.join(__dirname, 'template.html'),
    'utf8'
  );
  const result = Handlebars.compile(template)({
    html,
    useLink: !ctx.options.no_link
  });
  await fs.writeFile(path.join(outDir, 'index.html'), result, 'utf8');

  const warnUnused = (name, obj, map) => {
    const unused = Object.keys(obj).filter(t => !map.has(t));
    if (unused.length) {
      reporter.warn(`Unused ${name}: ` + unused.join(', '));
    }
  };
  warnUnused('references', references, refTagMap);
  warnUnused('figures', figures, figTagMap);

  reporter.output('index.html');
};

const generateCss = async (ctx, reporter) => {
  const { sourceDir, outDir } = ctx;
  reporter.section('Generating CSS...');

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

const convertImages = async (ctx, reporter) => {
  const { sourceDir, outDir, figures, figTagMap } = ctx;
  reporter.section('Converting Images...');
  for (const [tag, index] of figTagMap.entries()) {
    const figure = figures[tag];
    const files = await glob(path.resolve(sourceDir, tag + '.{jpg,png,pdf}'));
    if (files.length === 0) {
      throw new Error(`Figure "${tag}" not found.`);
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
  const styles = extend(true, {}, defaultStyle, customStyles);

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
    refTagMap: new Map(),
    figures,
    figTagMap: new Map(),
    styles,
    options
  };
};

const run = async (sourceDir, outDir, options, reporter) => {
  try {
    await fs.ensureDir(outDir);
    const ctx = await createContext(sourceDir, outDir, options, reporter);
    await generateHtml(ctx, reporter);
    await convertImages(ctx, reporter);
    await generateCss(ctx, reporter);
  } catch (err) {
    reporter.error(err.message);
  }
};

export default run;
