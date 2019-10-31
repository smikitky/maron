import chokidar from 'chokidar';
import dashdash from 'dashdash';
import _ from 'lodash';
import run from './run';

const main = async () => {
  const sourceDir = './src';

  const parser = dashdash.createParser({
    options: [
      { names: ['watch', 'w'], type: 'bool', help: 'Watch source files' },
      { names: ['verbose', 'v'], type: 'bool', help: 'Print more info' },
      { names: ['no-link', 'n'], type: 'bool', help: 'Disable links' },
      { names: ['help', 'h'], type: 'bool', help: 'Prints this message' },
      { names: ['clear', 'c'], type: 'bool', help: 'Clear console on re-run' }
    ]
  });

  const help = () => {
    console.log('ron - Markdown utility for academic writing\n');
    console.log('Usage: npx ron [options]');
    console.log(parser.help());
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
    process.exit(0);
  }

  const start = () => run(sourceDir, options);
  await start();

  if (options.watch) {
    let recompiling = false;
    console.log('Watching source and reference files...');
    const handler = _.debounce(() => {
      if (recompiling) return;
      recompiling = true;
      if (options.clear) console.clear();
      console.log('Recompiling...');
      start().then(() => (recompiling = false));
    }, 300);
    chokidar.watch('./src').on('change', handler);
  }
};

main();
