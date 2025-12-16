import chokidar from 'chokidar';
import { cac } from 'cac';
import { EventEmitter } from 'events';
import fs from 'node:fs/promises';
import path from 'path';
import createReporter from './reporter.ts';
import run from './run.ts';
import serve from './serve.ts';
import { type MainOptions } from './types.ts';

// const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const main = async () => {
  const cli = cac('maron');

  cli
    .option('--init', 'Initialize a new article.')
    .option('--src <dir>', 'Source dir', { default: './src' })
    .option('--out <dir>', 'Output dir', { default: './out' })
    .option('-w, --watch', 'Watch source files')
    .option('-v, --verbose', 'Print more info')
    .option('-n, --no-link', 'Disable links')
    .option('-t, --text-only', 'No image convertion')
    .option('-c, --clear', 'Clear console on re-run')
    .option('-s, --serve', 'Make instant HTTP server')
    .option('-h, --help', 'Prints this message');

  const { options } = cli.parse();
  const rawArgs = cli.rawArgs ?? [];
  const noLink = options.link === false || rawArgs.includes('-n') || rawArgs.includes('--no-link');
  const parsedOptions: MainOptions = {
    init: options.init,
    src: options.src,
    out: options.out,
    watch: options.watch,
    verbose: options.verbose,
    no_link: noLink,
    text_only: options.textOnly,
    clear: options.clear,
    serve: options.serve,
    help: options.help
  };

  if (parsedOptions.help) {
    cli.outputHelp();
    return;
  }

  const reporter = createReporter(parsedOptions.verbose);

  if (parsedOptions.init) {
    const { src } = parsedOptions;
    reporter.section('Initializing a New MaRon Project...');
    reporter.log(`Setting up a new article under ${src}...`);
    try {
      await fs.mkdir(src, { recursive: true });
      await fs.cp(path.resolve(__dirname, '..', 'init-template'), src, {
        recursive: true,
        force: false,
        errorOnExist: true
      });
      reporter.log(`Created an empty project under ${src}.`);
    } catch (err: any) {
      reporter.error(err.message);
      reporter.error('Is your src directory empty and writable?');
    }
    return;
  }

  const start = () => run(parsedOptions.src, parsedOptions.out, parsedOptions, reporter);
  await start();

  const debounce = <T extends (...args: any[]) => void>(
    fn: T,
    wait = 300
  ) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        fn(...args);
      }, wait);
    };
  };

  let notify = new EventEmitter();
  if (parsedOptions.serve) {
    serve(parsedOptions.out, notify);
  }

  if (parsedOptions.watch || parsedOptions.serve) {
    let busy = false;
    console.log('Watching source and reference files...');
    const handler = debounce(() => {
      if (busy) return;
      busy = true;
      if (parsedOptions.clear) console.clear();
      console.log('Recompiling...');
      start().then(() => {
        busy = false;
        notify.emit('change');
      });
    }, 300);
    chokidar.watch(parsedOptions.src).on('change', handler);
  }
};

main();
