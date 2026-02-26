import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { __testing } from './run.ts';

describe('run image cache', () => {
  const createdDirs: string[] = [];
  const outDirA = '/tmp/out-a';
  const outDirB = '/tmp/out-b';

  afterEach(async () => {
    __testing.imageBuildCacheByOutDir.clear();
    for (const dir of createdDirs.splice(0)) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test('should convert when cache is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maron-test-'));
    createdDirs.push(tmpDir);
    const outFile = path.join(tmpDir, 'fig-1.png');
    const sig = __testing.createImageBuildSignature(
      '/tmp/input.png',
      123,
      72,
      'png'
    );
    const shouldConvert = await __testing.shouldConvertImageOutput(
      outDirA,
      outFile,
      sig
    );
    assert.equal(shouldConvert, true);
  });

  test('should skip conversion when cache matches and output exists', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maron-test-'));
    createdDirs.push(tmpDir);
    const outFile = path.join(tmpDir, 'fig-1.png');
    await fs.writeFile(outFile, 'dummy');
    const sig = __testing.createImageBuildSignature(
      '/tmp/input.png',
      123,
      72,
      'png'
    );
    __testing.getImageBuildCache(outDirA).set(outFile, sig);
    const shouldConvert = await __testing.shouldConvertImageOutput(
      outDirA,
      outFile,
      sig
    );
    assert.equal(shouldConvert, false);
  });

  test('should convert when cache matches but output file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maron-test-'));
    createdDirs.push(tmpDir);
    const outFile = path.join(tmpDir, 'fig-1.png');
    const sig = __testing.createImageBuildSignature(
      '/tmp/input.png',
      123,
      72,
      'png'
    );
    __testing.getImageBuildCache(outDirA).set(outFile, sig);
    const shouldConvert = await __testing.shouldConvertImageOutput(
      outDirA,
      outFile,
      sig
    );
    assert.equal(shouldConvert, true);
  });

  test('prune removes stale cache entries only within same outDir', () => {
    __testing.getImageBuildCache(outDirA).set('/tmp/a.png', 'a');
    __testing.getImageBuildCache(outDirA).set('/tmp/b.png', 'b');
    __testing.getImageBuildCache(outDirB).set('/tmp/c.png', 'c');

    __testing.pruneImageBuildCache(outDirA, new Set(['/tmp/a.png']));

    assert.equal(__testing.getImageBuildCache(outDirA).has('/tmp/a.png'), true);
    assert.equal(__testing.getImageBuildCache(outDirA).has('/tmp/b.png'), false);
    assert.equal(__testing.getImageBuildCache(outDirB).has('/tmp/c.png'), true);
  });

  test('prune on figure-less entry does not drop other entry cache', () => {
    __testing.getImageBuildCache(outDirA).set('/tmp/fig-1.png', 'sig-a');
    __testing.pruneImageBuildCache(outDirB, new Set());
    assert.equal(
      __testing.getImageBuildCache(outDirA).has('/tmp/fig-1.png'),
      true
    );
  });
});
