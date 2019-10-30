import fs from 'fs-extra';
import MarkdownIt from 'markdown-it';
import path from 'path';
import url from 'url'; // Node >= 10.12 required
import glob from 'glob-promise';
import chokidar from 'chokidar';
import dashdash from 'dashdash';
import yaml from 'js-yaml';
import _ from 'lodash';

import formatReference from './formatReference';
import formatTag from './formatTag';
import parseIssue from './parseIssue';
import parseAuthors from './parseAuthors';
import convertToTiff from './convertToTiff';

const md = MarkdownIt({ html: true });
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const UNUSED = 9999;

const replaceReferences = (file, references, style) => {
  let refCounter = 1;
  /**
   * @type Map<string, number>
   */
  const tagMap = new Map();

  const replacer = (_, tags) => {
    const refs = tags.split(',');
    const indexes = [];
    refs.forEach(tag => {
      const reference = references[tag];
      if (!reference) throw new Error('Unknown ref: ' + tag);
      if (!tagMap.has(tag)) tagMap.set(tag, refCounter++);
      if (indexes.indexOf(tagMap.get(tag)) < 0) indexes.push(tagMap.get(tag));
    });
    return '[' + formatTag(indexes) + ']';
  };

  const referencesList = () => {
    const items = Object.keys(references)
      .sort((a, b) => tagMap.get(a) - tagMap.get(b))
      .map(k => {
        const item = references[k];
        const index = tagMap.get(k);
        const formatted = formatReference(item, style);
        return `  <li id="ref-${index}" value="${index}">${formatted}</li>`;
      })
      .join('\n');
    return `<ol>\n${items}\n</ol>`;
  };

  const result = file
    .replace(/`ref:(.+?)`/g, replacer)
    .replace(/`references`/g, referencesList);
  return result;
};

const toHtml = async () => {
  const mdContent = await fs.readFile('./out/index.md', 'utf8');
  const html = md.render(mdContent);
  const withHeaders = `<!doctype html><html><link rel='stylesheet' href='style.css'>\n${html}</html>`;
  await fs.writeFile('out/index.html', withHeaders, 'utf8');
  await fs.copyFile(path.join(__dirname, 'style.css'), './out/style.css');
  console.log('Wrote: out/index.html');
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

const addReferences = async (sourceFileName, referencesFileName) => {
  const sourceFile = await fs.readFile(sourceFileName, 'utf8');
  const referencesFile = await fs.readFile(referencesFileName, 'utf8');
  const { references, style } = parseReferences(yaml.load(referencesFile));
  const result = replaceReferences(sourceFile, references, style);

  await fs.ensureDir('./out');
  await fs.writeFile('./out/index.md', result, 'utf8');
  console.log('Wrote: out/index.md');
  if (Object.keys(references).some(r => r.index === UNUSED)) {
    console.log('WARNING: There are unused referece items.');
  }
};

const convertImages = async sourceDir => {
  const pdfs = await glob(path.resolve(sourceDir, '**/*.pdf'));
  for (const file of pdfs) {
    const relative = path.relative(sourceDir, file);
    const outFile = path.join('./out', relative).replace(/pdf$/i, 'tiff');
    await convertToTiff(file, outFile, { resolution: 300 });
    console.log(`Wrote: ${outFile}`);
  }
};

const main = async () => {
  const sourceDir = './src';
  const referencesFileName = path.join(sourceDir, 'references.yaml');
  const sourceFileName = path.join(sourceDir, 'index.md');

  const options = dashdash.parse({
    options: [
      { names: ['watch', 'w'], type: 'bool', help: 'Watch source files' }
    ]
  });

  const run = async () => {
    await addReferences(sourceFileName, referencesFileName);
    await convertImages(sourceDir);
    await toHtml();
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
