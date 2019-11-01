const esmRequire = require('esm')(module);
const run = esmRequire('./run').default;
const fs = require('fs-extra');
const path = require('path');

test('Run using init-template', async () => {
  const srcDir = path.resolve(__dirname, '..', 'init-template');
  const outDir = path.resolve(__dirname, '..', 'test-out');
  try {
    const mockReporter = {};
    ['log', 'info', 'warn', 'error', 'output', 'section'].forEach(
      m => (mockReporter[m] = jest.fn())
    );
    fs.emptyDir(outDir);
    await run(srcDir, outDir, {}, mockReporter);
    expect(mockReporter.error).not.toBeCalled();
    expect(mockReporter.output).toBeCalledWith('index.md');
    expect(mockReporter.output).toBeCalledWith('index.html');
    expect(mockReporter.output).toBeCalledWith('style.css');
  } finally {
    fs.remove(outDir);
  }
});
