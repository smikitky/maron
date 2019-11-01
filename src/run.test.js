const esmRequire = require('esm')(module);
const run = esmRequire('./run').default;
const fs = require('fs-extra');
const path = require('path');

test('Run using init-template', async () => {
  const srcDir = path.resolve(__dirname, '..', 'init-template');
  const outDir = path.resolve(__dirname, '..', 'test-out');
  try {
    const mockReporter = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      output: jest.fn(),
      section: jest.fn()
    };
    fs.emptyDir(outDir);
    await run(srcDir, outDir, {}, mockReporter);
    expect(mockReporter.error).not.toBeCalled();
  } finally {
    fs.remove(outDir);
  }
});
