import fs from 'fs-extra';
import MarkdownIt from 'markdown-it';
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
import convertToTiff from './convertToTiff';
import createReporter from './reporter';

const md = MarkdownIt({ html: true });
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const replaceReferences = (
  { sourceFile, references, style, figures, useLink },
  reporter
) => {
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
      return useLink
        ? `<a href="#ref-${index}" title="${escape(ref.title)}">${index}</a>`
        : `${index}`;
    });
    return '[' + linked + ']';
  };

  const figReplacer = (_, tag) => {
    const figure = figures.find(f => f.tag === tag);
    if (!figure) throw new Error('Unknown figure tag: ' + tag);
    const index = figTagMap.has(tag)
      ? figTagMap.get(tag)
      : (() => {
          const index = figCounter++;
          figTagMap.set(tag, index);
          reporter.info(`figure #${index} = ${tag}`);
          return index;
        })();
    return useLink
      ? `<a href="#fig-${index}" title="${tag}">${index}</a>`
      : `${index}`;
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
    const items = figures
      .map(f => f.tag)
      .sort((a, b) => figTagMap.get(a) - figTagMap.get(b))
      .map(tag => {
        const index = figTagMap.get(tag);
        if (typeof index !== 'number') {
          reporter.warn('Unused figure: ' + tag);
          return;
        }
        const figure = figures.find(f => f.tag === tag);
        return `<figure id="fig-${index}"><caption><b>Figure ${index}</b> ${figure.caption}</caption></figure>`;
      });
    return items.join('\n');
  };

  const result = sourceFile
    .replace(/`ref:(.+?)`/g, refReplacer)
    .replace(/`fig:(.+?)`/g, figReplacer)
    .replace(/`references`/g, referencesList)
    .replace(/`figures`/g, figuresList);
  return result;
};

const toHtml = async (ctx, reporter) => {
  reporter.section('Generating HTML...');
  const html = md.render(ctx.processedMd);
  const withHeaders = `<!doctype html><html><link rel='stylesheet' href='style.css'>\n${html}</html>`;
  await fs.writeFile('out/index.html', withHeaders, 'utf8');
  await fs.copyFile(path.join(__dirname, 'style.css'), './out/style.css');
  reporter.output('out/index.html');
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
  await fs.writeFile('./out/index.md', result, 'utf8');
  reporter.output('out/index.md');
  ctx.processedMd = result;
};

const convertImages = async (ctx, reporter) => {
  const { sourceDir } = ctx;
  reporter.section('Converting Images...');
  const pdfs = await glob(path.resolve(sourceDir, '**/*.pdf'));
  for (const file of pdfs) {
    const relative = path.relative(sourceDir, file);
    const outFile = path.join('./out', relative).replace(/pdf$/i, 'tiff');
    await convertToTiff(file, outFile, { resolution: 300 });
    reporter.output(outFile);
  }
  reporter.log(`Output ${pdfs.length} image(s).`);
};

const createContext = async (sourceDir, useLink, reporter) => {
  reporter.section('Loading source files...');
  const sourceFileName = path.join(sourceDir, 'index.md');
  const sourceFile = await fs.readFile(sourceFileName, 'utf8');

  const referencesFileName = path.join(sourceDir, 'references.yaml');
  const referencesFile = await fs.readFile(referencesFileName, 'utf8');
  const { references, style } = parseReferences(yaml.load(referencesFile));
  reporter.log(`Loaded ${Object.keys(references).length} reference items.`);

  let figures = [];
  try {
    const figuresFileName = path.join(sourceDir, 'figures.yaml');
    const figuresFile = await fs.readFile(figuresFileName, 'utf8');
    figures = yaml.load(figuresFile);
    reporter.log(`Loaded ${figures.length} figure items.`);
  } catch (err) {
    reporter.warn('No figures.yaml found.');
  }

  return { sourceDir, sourceFile, references, style, figures, useLink };
};

const main = async () => {
  const sourceDir = './src';

  const options = dashdash.parse({
    options: [
      { names: ['watch', 'w'], type: 'bool', help: 'Watch source files' },
      { names: ['verbose', 'v'], type: 'bool', help: 'Print more info' },
      { names: ['no-link', 'n'], type: 'bool', help: 'Disable links' }
    ]
  });

  const reporter = createReporter(options.verbose);

  const run = async () => {
    const ctx = await createContext(sourceDir, !options.no_link, reporter);
    await addReferences(ctx, reporter);
    await convertImages(ctx, reporter);
    await toHtml(ctx, reporter);
  };

  await run();

  if (options.watch) {
    let recompiling = false;
    console.log('Watching source and reference files...');
    const handler = _.debounce(() => {
      if (recompiling) return;
      recompiling = true;
      console.log('Recompiling...');
      run().then(() => (recompiling = false));
    }, 300);
    chokidar.watch('./src').on('change', handler);
  }
};

main();
