import path from 'path';
import chokidar from 'chokidar';
import dashdash from 'dashdash';
import _ from 'lodash';
import fs from 'fs-extra';
import run from './run';
import url from 'url'; // Node >= 10.12 required
import createReporter from './reporter';
import serve from './serve';
import { EventEmitter } from 'events';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const main = async () => {
  const parser = dashdash.createParser({
    options: [
      { names: ['init'], type: 'bool', help: 'Initialize a new article.' },
      { names: ['src'], type: 'string', help: 'Source dir', default: './src' },
      { names: ['out'], type: 'string', help: 'Output dir', default: './out' },
      { names: ['watch', 'w'], type: 'bool', help: 'Watch source files' },
      { names: ['verbose', 'v'], type: 'bool', help: 'Print more info' },
      { names: ['no-link', 'n'], type: 'bool', help: 'Disable links' },
      { names: ['text-only', 't'], type: 'bool', help: 'No image convertion' },
      { names: ['clear', 'c'], type: 'bool', help: 'Clear console on re-run' },
      { names: ['serve', 's'], type: 'bool', help: 'Make instant HTTP server' },
      { names: ['help', 'h'], type: 'bool', help: 'Prints this message' }
    ]
  });

  const help = () => {
    console.log('ron - Markdown utility for academic writing\n');
    console.log('Usage: npx ron [options]');
    console.log(parser.help({ includeDefault: true }));
  };

  let options;
  try {
    options = parser.parse(process.argv);
  } catch (err) {
    console.error(err.message);
    help();
    process.exit(1);
  }

  if (options.help) {
    help();
    return;
  }

  const reporter = createReporter(options.verbose);

  if (options.init) {
    const { src } = options;
    reporter.section('Initializing a New Ron Project...');
    reporter.log(`Setting up a new article under ${src}...`);
    try {
      await fs.ensureDir(src);
      await fs.copy(path.resolve(__dirname, '..', 'init-template'), src, {
        overwrite: false,
        errorOnExist: true
      });
      reporter.log(`Created an empty project under ${src}.`);
    } catch (err) {
      reporter.error(err.message);
      reporter.error('Is your src directory empty and writable?');
    }
    return;
  }

  const start = () => run(options.src, options.out, options, reporter);
  await start();

  let notify = new EventEmitter();
  if (options.serve) {
    serve(options.out, notify);
  }

  if (options.watch || options.serve) {
    let busy = false;
    console.log('Watching source and reference files...');
    const handler = _.debounce(() => {
      if (busy) return;
      busy = true;
      if (options.clear) console.clear();
      console.log('Recompiling...');
      start().then(() => {
        busy = false;
        notify.emit('change');
      });
    }, 300);
    chokidar.watch('./src').on('change', handler);
  }
};

main();
