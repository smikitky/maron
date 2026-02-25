import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import resolveSourceEntries from './config.ts';

const createTempDir = async () =>
  fs.mkdtemp(path.join(os.tmpdir(), 'maron-config-test-'));

const writeConfig = async (dir: string, text: string) => {
  await fs.writeFile(path.join(dir, 'maron.config.js'), text, 'utf8');
};

describe('config', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map(dir => fs.rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  test('uses src/out defaults when maron.config.js is missing', async () => {
    const dir = await createTempDir();
    dirs.push(dir);
    const entries = await resolveSourceEntries(dir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].name, 'main');
    assert.equal(entries[0].isMain, true);
    assert.equal(entries[0].routePath, '/');
    assert.equal(entries[0].sourceDir, path.resolve(dir, 'src'));
    assert.equal(entries[0].outDir, path.resolve(dir, 'out'));
  });

  test('resolves main and non-main outputs from config', async () => {
    const dir = await createTempDir();
    dirs.push(dir);
    await writeConfig(
      dir,
      `
export default {
  sources: {
    paper: { src: 'src-paper', main: true },
    rebuttal: { src: 'src-rebuttal' }
  }
};
`
    );
    const entries = await resolveSourceEntries(dir);
    assert.equal(entries.length, 2);
    const paper = entries.find(entry => entry.name === 'paper');
    const rebuttal = entries.find(entry => entry.name === 'rebuttal');
    assert.ok(paper);
    assert.ok(rebuttal);
    assert.equal(paper.isMain, true);
    assert.equal(paper.routePath, '/');
    assert.equal(paper.outDir, path.resolve(dir, 'out'));
    assert.equal(rebuttal.isMain, false);
    assert.equal(rebuttal.routePath, '/rebuttal');
    assert.equal(rebuttal.outDir, path.resolve(dir, 'out', 'rebuttal'));
  });

  test('uses first source as main when no main flag is set', async () => {
    const dir = await createTempDir();
    dirs.push(dir);
    await writeConfig(
      dir,
      `
export default {
  sources: {
    alpha: { src: 'src-a' },
    beta: { src: 'src-b' }
  }
};
`
    );
    const entries = await resolveSourceEntries(dir);
    const alpha = entries.find(entry => entry.name === 'alpha');
    const beta = entries.find(entry => entry.name === 'beta');
    assert.ok(alpha);
    assert.ok(beta);
    assert.equal(alpha.isMain, true);
    assert.equal(beta.isMain, false);
  });

  test('throws when multiple sources are marked as main', async () => {
    const dir = await createTempDir();
    dirs.push(dir);
    await writeConfig(
      dir,
      `
export default {
  sources: {
    alpha: { src: 'src-a', main: true },
    beta: { src: 'src-b', main: true }
  }
};
`
    );
    await assert.rejects(
      () => resolveSourceEntries(dir),
      /Only one source can be main=true/
    );
  });

  test('throws when reserved source name is used', async () => {
    const dir = await createTempDir();
    dirs.push(dir);
    await writeConfig(
      dir,
      `
export default {
  sources: {
    updates: { src: 'src-updates' }
  }
};
`
    );
    await assert.rejects(() => resolveSourceEntries(dir), /reserved/);
  });
});
