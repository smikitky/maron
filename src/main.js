#!/usr/bin/env node

import fs from 'fs-extra';
import MarkdownIt from 'markdown-it';
import path from 'path';
import url from 'url'; // Node >= 10.12 required
import chokidar from 'chokidar';
import dashdash from 'dashdash';
import _ from 'lodash';

import formatTag from './formatTag';

const md = MarkdownIt({ html: true });
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const UNUSED = 9999;

const extractReferences = file => {
  const lines = file.split('\n');
  const references = {};
  lines.forEach(line => {
    const match = /^\d+\.\s+`tag:(.+)`\s+(.+)/.exec(line);
    if (!match) return;
    const [, tag, source] = match;
    references[tag] = { source, index: UNUSED };
  });
  return references;
};

const replaceReferences = (file, references) => {
  let refCounter = 1;

  const replacer = (_, tags) => {
    const refs = tags.split(',');
    const indexes = [];
    refs.forEach(ref => {
      const reference = references[ref];
      if (!reference) throw new Error('Unknown ref: ' + ref);
      if (reference.index === UNUSED) reference.index = refCounter++;
      if (indexes.indexOf(reference.index) < 0) indexes.push(reference.index);
    });
    return '[' + formatTag(indexes.sort()) + ']';
  };

  const referencesList = () => {
    return Object.keys(references)
      .sort((a, b) => references[a].index - references[b].index)
      .map(k => {
        const item = references[k];
        return `${item.index}. ${item.source}`;
      })
      .join('\n');
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

const addReferences = async (sourceFileName, referencesFileName) => {
  const referencesFile = await fs.readFile(referencesFileName, 'utf8');
  const sourceFile = await fs.readFile(sourceFileName, 'utf8');
  const references = extractReferences(referencesFile);
  const result = replaceReferences(sourceFile, references);

  await fs.ensureDir('./out');
  await fs.writeFile('./out/index.md', result, 'utf8');
  console.log('Wrote: out/index.md');
  if (Object.keys(references).some(r => r.index === UNUSED)) {
    console.log('WARNING: There are unused referece items.');
  }
};

const main = async () => {
  const referencesFileName = './src/references.md';
  const sourceFileName = './src/index.md';

  const options = dashdash.parse({
    options: [
      { names: ['watch', 'w'], type: 'bool', help: 'Watch source files.' }
    ]
  });

  const run = async () => {
    await addReferences(sourceFileName, referencesFileName);
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
