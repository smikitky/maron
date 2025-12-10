import pc from 'picocolors';

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
    console.log('\n' + pc.bold(pc.underline(title)));
  };
  const log = (data: string) => {
    console.log(indent(data));
  };
  const output = (name: string) => {
    log(pc.cyan('WROTE') + ' ' + name);
  };
  const info = (data: string) => {
    if (verbose) log(data);
  };
  const warn = (data: string) => {
    log(pc.bgYellow(pc.black('WARN')) + ' ' + data);
  };
  const error = (data: string) => {
    log(pc.bgRed(pc.black('ERR')) + ' ' + data);
  };
  return { section, log, output, info, warn, error };
};

export default createReporter;
