import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import path from 'node:path';

import { promises as fs } from 'node:fs';

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
    await fs.rm(outDir, { recursive: true, force: true });
  });

  test('Run using init-template', async () => {
    const { reporter, calls } = createMockReporter();
    await fs.rm(outDir, { recursive: true, force: true });
    await fs.mkdir(outDir, { recursive: true });
    await run(
      srcDir,
      outDir,
      { text_only: true } as any,
      reporter as any
    );
    assert.equal(calls.error.length, 0);
    assert.ok(calls.output.includes('index.html'));
    assert.ok(calls.output.includes('style.css'));
    const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
    assert.equal(html.includes('maron-dev-nav-data'), false);
    await assert.rejects(() => fs.readFile(path.join(outDir, 'maron-dev.js'), 'utf8'));
    await assert.rejects(() => fs.readFile(path.join(outDir, 'maron-dev.css'), 'utf8'));
  });

  test('renders dev floating nav in serve mode', async () => {
    const { reporter } = createMockReporter();
    await fs.rm(outDir, { recursive: true, force: true });
    await fs.mkdir(outDir, { recursive: true });
    await run(
      srcDir,
      outDir,
      {
        text_only: true,
        serve: true,
        dev_nav: [
          { name: 'manuscript', path: '/', isCurrent: true },
          { name: 'rebuttal', path: '/rebuttal', isCurrent: false }
        ]
      } as any,
      reporter as any
    );
    const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
    assert.ok(html.includes('id="maron-dev-nav-data"'));
    assert.ok(html.includes('<script src="./maron-dev.js"></script>'));
    assert.ok(html.includes('"path":"/rebuttal"'));
    const devScript = await fs.readFile(path.join(outDir, 'maron-dev.js'), 'utf8');
    assert.ok(devScript.includes("cssLink.href = './maron-dev.css'"));
    assert.ok(devScript.includes("new EventSource('/updates')"));
    const devCss = await fs.readFile(path.join(outDir, 'maron-dev.css'), 'utf8');
    assert.ok(devCss.includes('.maron-dev-nav-current'));
  });
});
