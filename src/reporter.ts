import chalk from 'chalk';

const indent = (text: string) => {
  const prefix = '  ';
  return text
    .split('\n')
    .map(line => (line ? prefix + line : line))
    .join('\n');
};

export interface Reporter {
  section: (title: string) => void;
  log: (data: string) => void;
  output: (name: string) => void;
  info: (data: string) => void;
  warn: (data: string) => void;
  error: (data: string) => void;
}

const createReporter = (verbose = false): Reporter => {
  const section = (title: string) => {
    console.log('\n' + chalk.bold.underline(title));
  };
  const log = (data: string) => {
    console.log(indent(data));
  };
  const output = (name: string) => {
    log(chalk.cyan('WROTE') + ' ' + name);
  };
  const info = (data: string) => {
    if (verbose) log(data);
  };
  const warn = (data: string) => {
    log(chalk.black.bgYellow('WARN') + ' ' + data);
  };
  const error = (data: string) => {
    log(chalk.black.bgRed('ERR') + ' ' + data);
  };
  return { section, log, output, info, warn, error };
};

export default createReporter;
