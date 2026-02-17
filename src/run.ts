import * as cheerio from 'cheerio';
import extend from 'extend';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { glob } from 'glob';
import Handlebars from 'handlebars';
import yaml from 'js-yaml';
import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import mdInclude from 'markdown-it-include';
import namedHeadings from 'markdown-it-named-headings';
import path from 'path';
import convertImage from './convertImage.ts';
import defaultStyle from './defaultStyle.ts';
import parseAuthors from './parseAuthors.ts';
import parseIssue from './parseIssue.ts';
import readFileIfExists from './readFileIfExists.ts';
import replaceBacktick from './replaceBacktick.ts';
import { type Reporter } from './reporter.ts';
import type {
  FigureEntry,
  MainOptions,
  MaRonContext,
  ReferenceEntry
} from './types.ts';

const __dirname = import.meta.dirname;
const imageBuildCache = new Map<string, string>();

const backticks = replaceBacktick();
const md = MarkdownIt({ html: true })
  .use(namedHeadings)
  .use(attrs)
  .use(mdInclude)
  .use(backticks.register);
// const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const generateHtml = async (ctx: MaRonContext, reporter: Reporter) => {
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
    useLink: !ctx.options.no_link,
    serve: !!ctx.options.serve
  });
  reporter.log('Generated HTML.');

  // Post-procee HTML (auto links, etc)
  const $ = cheerio.load(result);
  $('.ref').each((i, elem) => {
    const index = $(elem).html();
    const ref = $(`#ref-${index}`);
    $(elem).attr('title', ref.text());
  });
  if (!ctx.options.no_link) {
    $('.ref,.fig,.tab').each((i, elem) => {
      const $elem = $(elem);
      const type = $elem.attr('class');
      const link = $('<a>').attr('href', `#${type}-${$elem.text()}`);
      $elem.wrap(link);
    });
    $('ol.references > li').each((i, li) => {
      const doi = $(li).data('doi');
      if (!doi) return;
      const link = $('<a>')
        .addClass('doi-link')
        .attr('target', '_blank')
        .attr('href', `http://doi.org/${doi}`)
        .text('DOI');
      $(li).append(link);
    });
  }
  reporter.log('Performed HTML post-processing.');

  await fs.writeFile(path.join(outDir, 'index.html'), $.html(), 'utf8');

  const warnUnused = (
    name: string,
    obj: { [tag: string]: ReferenceEntry | FigureEntry },
    map: Map<string, number>
  ) => {
    const unused = Object.keys(obj).filter(t => !map.has(t));
    if (unused.length) {
      reporter.warn(`Unused ${name}: ` + unused.join(', '));
    }
  };
  warnUnused('references', references, refTagMap);
  warnUnused('figures', figures, figTagMap);

  reporter.output('index.html');
};

const generateCss = async (ctx: MaRonContext, reporter: Reporter) => {
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

const findFileMatchingTag = async (
  sourceDir: string,
  name: string,
  tag: string,
  extentions: string[]
) => {
  const files = await glob(
    path.resolve(sourceDir, tag + '.{' + extentions.join(',') + '}')
  );
  if (files.length === 0) {
    throw new Error(`${name} "${tag}" not found.`);
  }
  if (files.length > 1) {
    throw new Error(`${name} "${tag}" matched two or more file names.`);
  }
  return files[0];
};

const createImageBuildSignature = (
  inFile: string,
  mtimeMs: number,
  resolution: number,
  outType: 'tiff' | 'png'
) => `${inFile}|${mtimeMs}|${resolution}|${outType}`;

const fileExists = async (file: string) => {
  try {
    await fs.stat(file);
    return true;
  } catch {
    return false;
  }
};

const shouldConvertImageOutput = async (
  outFile: string,
  signature: string
) => {
  const cached = imageBuildCache.get(outFile);
  if (cached !== signature) return true;
  const exists = await fileExists(outFile);
  return !exists;
};

const pruneImageBuildCache = (usedOutputs: Set<string>) => {
  for (const outFile of imageBuildCache.keys()) {
    if (!usedOutputs.has(outFile)) {
      imageBuildCache.delete(outFile);
    }
  }
};

const convertImages = async (ctx: MaRonContext, reporter: Reporter) => {
  const { sourceDir, outDir, figures, figTagMap, options } = ctx;
  reporter.section('Converting Images...');
  if (options.text_only) {
    reporter.log('Skip');
    return;
  }
  let convertedCount = 0;
  let skippedCount = 0;
  const usedOutputs = new Set<string>();
  for (const [tag, index] of figTagMap.entries()) {
    const figure = figures[tag];
    const subFigures = Array.isArray(figure.subFigures)
      ? figure.subFigures
      : [{}];
    for (const subFigure of subFigures) {
      const postfix = subFigure.name ? '-' + subFigure.name : '';
      const inFile = await findFileMatchingTag(
        sourceDir,
        'Figure',
        tag + postfix,
        ['jpg', 'png', 'pdf']
      );
      reporter.info(`fig #${index} => ${path.relative(sourceDir, inFile)}`);
      const { mtimeMs } = await fs.stat(inFile);

      const tiffOut = path.join(outDir, `fig-${index}${postfix}.tiff`);
      const tiffResolution = subFigure.resolution || figure.resolution || 600;
      const tiffSignature = createImageBuildSignature(
        inFile,
        mtimeMs,
        tiffResolution,
        'tiff'
      );
      usedOutputs.add(tiffOut);
      if (await shouldConvertImageOutput(tiffOut, tiffSignature)) {
        const tiffOutBuf = await convertImage(createReadStream(inFile), {
          resolution: tiffResolution,
          outType: 'tiff'
        });
        await fs.writeFile(tiffOut, tiffOutBuf);
        reporter.output(tiffOut);
        convertedCount++;
      } else {
        skippedCount++;
      }
      imageBuildCache.set(tiffOut, tiffSignature);

      const pngOut = path.join(outDir, `fig-${index}${postfix}.png`);
      const pngResolution =
        subFigure.webResolution ||
        subFigure.resolution ||
        figure.webResolution ||
        figure.resolution ||
        72;
      const pngSignature = createImageBuildSignature(
        inFile,
        mtimeMs,
        pngResolution,
        'png'
      );
      usedOutputs.add(pngOut);
      if (await shouldConvertImageOutput(pngOut, pngSignature)) {
        const pngOutBuf = await convertImage(createReadStream(inFile), {
          resolution: pngResolution,
          outType: 'png'
        });
        await fs.writeFile(pngOut, pngOutBuf);
        reporter.output(pngOut);
        convertedCount++;
      } else {
        skippedCount++;
      }
      imageBuildCache.set(pngOut, pngSignature);
    }
  }
  pruneImageBuildCache(usedOutputs);
  reporter.log(
    `Converted ${convertedCount} output image(s), skipped ${skippedCount}.`
  );
};

const parseReference = (ref: any): ReferenceEntry => {
  return {
    ...ref,
    authors:
      typeof ref.authors === 'string' ? parseAuthors(ref.authors) : ref.authors,
    issue: typeof ref.issue === 'string' ? parseIssue(ref.issue) : ref.issue
  };
};

/**
 * Load source files into memory.
 */
const createContext = async (
  sourceDir: string,
  outDir: string,
  options: MainOptions,
  reporter: Reporter
): Promise<MaRonContext> => {
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
    references = Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        parseReference(value)
      ])
    );
    reporter.log(`Loaded ${Object.keys(references).length} reference items.`);
  }

  let figures: MaRonContext['figures'] = {};
  const figuresFileName = path.join(sourceDir, 'figures.yaml');
  const figuresFile = await readFileIfExists(figuresFileName);
  if (!figuresFile) {
    reporter.warn('figures.yaml not found.');
  } else {
    figures = yaml.load(figuresFile) as any;
    reporter.log(`Loaded ${Object.keys(figures).length} figure items.`);
  }

  let tables: MaRonContext['tables'] = {};
  const tablesFileName = path.join(sourceDir, 'tables.yaml');
  const tablesFile = await readFileIfExists(tablesFileName);
  if (!tablesFile) {
    reporter.warn('tables.yaml not found.');
  } else {
    tables = yaml.load(tablesFile) as any;
    for (const [tag, item] of Object.entries(tables)) {
      const file = await findFileMatchingTag(sourceDir, 'Table', tag, [
        'md',
        'html'
      ]);
      const isMd = /\.md$/.test(file);
      const fileContent = await fs.readFile(file, 'utf8');
      item.content = isMd ? md.render(fileContent) : fileContent;
    }
    reporter.log(`Loaded ${Object.keys(tables).length} table items.`);
  }

  return {
    sourceDir,
    outDir,
    sourceFile,
    references,
    refTagMap: new Map(),
    figures,
    figTagMap: new Map(),
    tables,
    tabTagMap: new Map(),
    styles,
    options
  };
};

const run = async (
  sourceDir: string,
  outDir: string,
  options: MainOptions,
  reporter: Reporter
) => {
  try {
    await fs.mkdir(outDir, { recursive: true });
    const ctx = await createContext(sourceDir, outDir, options, reporter);
    await generateHtml(ctx, reporter);
    await convertImages(ctx, reporter);
    await generateCss(ctx, reporter);
  } catch (err: any) {
    reporter.error(err.message);
  }
};

export default run;

export const __testing = {
  createImageBuildSignature,
  shouldConvertImageOutput,
  pruneImageBuildCache,
  imageBuildCache
};
