import run from './run';
import * as fs from 'fs-extra';
import * as path from 'path';

test('Run using init-template', async () => {
  const srcDir = path.resolve(__dirname, '..', 'init-template');
  const outDir = path.resolve(__dirname, '..', 'test-out');
  try {
    const mockReporter: any = {};
    ['log', 'info', 'warn', 'error', 'output', 'section'].forEach(
      m => (mockReporter[m] = jest.fn())
    );
    fs.emptyDir(outDir);
    await run(
      srcDir,
      outDir,
      { src: srcDir, out: outDir, text_only: true },
      mockReporter
    );
    expect(mockReporter.error).not.toBeCalled();
    expect(mockReporter.output).toBeCalledWith('index.html');
    expect(mockReporter.output).toBeCalledWith('style.css');
  } finally {
    fs.remove(outDir);
  }
});
