import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import path from 'node:path';

import fs from 'fs-extra';

import run from './run.ts';

const __dirname = import.meta.dirname;

const createMockReporter = () => {
  const calls = {
    output: [] as any[],
    error: [] as any[]
  };
  const reporter = {
    log: () => {},
    info: () => {},
    warn: () => {},
    section: () => {},
    error: (...args: any[]) => {
      calls.error.push(args);
    },
    output: (...args: any[]) => {
      calls.output.push(...args);
    }
  };
  return { reporter, calls };
};

describe('run', () => {
  const srcDir = path.resolve(__dirname, '..', 'init-template');
  const outDir = path.resolve(__dirname, '..', 'test-out');

  afterEach(async () => {
    await fs.remove(outDir);
  });

  test('Run using init-template', async () => {
    const { reporter, calls } = createMockReporter();
    await fs.emptyDir(outDir);
    await run(
      srcDir,
      outDir,
      { src: srcDir, out: outDir, text_only: true } as any,
      reporter as any
    );
    assert.equal(calls.error.length, 0);
    assert.ok(calls.output.includes('index.html'));
    assert.ok(calls.output.includes('style.css'));
  });
});
