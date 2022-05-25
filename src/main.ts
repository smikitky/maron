import path from 'path';
import chokidar from 'chokidar';
import dashdash from 'dashdash';
import _ from 'lodash';
import fs from 'fs-extra';
import run from './run';
import url from 'url';
import createReporter from './reporter';
import serve from './serve';
import { EventEmitter } from 'events';

// const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface MainOptions {
  init?: boolean;
  src: string;
  out: string;
  watch?: boolean;
  verbose?: boolean;
  no_link?: boolean;
  text_only?: boolean;
  clear?: boolean;
  serve?: boolean;
  help?: boolean;
}

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
    console.log('maron - Markdown utility for academic writing\n');
    console.log('Usage: npx maron [options]');
    console.log(parser.help({ includeDefault: true }));
  };

  const options = (() => {
    try {
      return parser.parse(process.argv) as any as MainOptions;
    } catch (err: any) {
      console.error(err.message);
      help();
      process.exit(1);
    }
  })();

  if (options.help) {
    help();
    return;
  }

  const reporter = createReporter(options.verbose);

  if (options.init) {
    const { src } = options;
    reporter.section('Initializing a New MaRon Project...');
    reporter.log(`Setting up a new article under ${src}...`);
    try {
      await fs.ensureDir(src);
      await fs.copy(path.resolve(__dirname, '..', 'init-template'), src, {
        overwrite: false,
        errorOnExist: true
      });
      reporter.log(`Created an empty project under ${src}.`);
    } catch (err: any) {
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
    chokidar.watch(options.src).on('change', handler);
  }
};

main();
