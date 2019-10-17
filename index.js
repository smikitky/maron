#!/usr/bin/env node

const fs = require('fs-extra');

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

/**
 * Does a conversion like `[1,3,4,6,7,8]` to `'1,3,4,6-8'`.
 * @param {number[]} arr The input array.
 */
const formatTag = arr => {
  let min = undefined,
    max = undefined,
    result = '';

  const flush = () => {
    if (result) result += ',';
    result +=
      max > min + 1 ? min + '-' + max : max === min + 1 ? min + ',' + max : min;
    min = max = undefined;
  };

  for (const i of arr) {
    if (min === undefined) {
      min = max = i;
    } else if (i === max + 1) {
      max = i;
    } else {
      flush();
      min = max = i;
    }
  }
  flush();
  return result;
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

const main = () => {
  const referencesFileName = './src/references.md';
  const sourceFileName = './src/index.md';

  const compile = () => {
    const referencesFile = fs.readFileSync(referencesFileName, 'utf8');
    const sourceFile = fs.readFileSync(sourceFileName, 'utf8');

    const references = extractReferences(referencesFile);
    const result = replaceReferences(sourceFile, references);

    fs.ensureDirSync('./out');
    fs.writeFileSync('./out/index.md', result, 'utf8');
    console.log('Wrote: out/index.md');
    if (Object.keys(references).some(r => r.index === UNUSED)) {
      console.log('WARNING: There are unused referece items.');
    }
  };

  const watchMode = !!process.argv.find(a => a === '-w' || a === '--watch');
  if (watchMode) {
    let recompiling = false;
    compile();
    console.log('Watching source and reference files...');
    const handler = () => {
      if (recompiling) return;
      recompiling = true;
      setTimeout(() => {
        console.log('Recompiling...');
        compile();
        recompiling = false;
      }, 300);
    };
    fs.watch(referencesFileName, handler);
    fs.watch(sourceFileName, handler);
  } else {
    compile();
  }
};

main();
