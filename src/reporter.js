import chalk from 'chalk';
import indent from 'indent-string';

const createReporter = (verbose = false) => {
  const section = title => {
    console.log('\n' + chalk.bold.underline(title));
  };
  const log = data => {
    console.log(indent(data, 2));
  };
  const output = name => {
    log(chalk.cyan('Wrote:') + ' ' + name);
  };
  const info = data => {
    if (verbose) log(data);
  };
  const warn = data => {
    log(chalk.yellow('WARN') + ' ' + data);
  };
  return { section, log, output, info, warn };
};

export default createReporter;
