import cp from 'child_process';
import concat from 'concat-stream';
import { Readable } from 'stream';

const exec = async (command, args, stdin) => {
  return new Promise((resolve, reject) => {
    const process = cp.spawn(command, args);
    stdin.pipe(process.stdin);
    let stdout, stderr;
    const catout = concat(buffer => (stdout = buffer));
    const caterr = concat(buffer => (stderr = buffer));
    process.stdout.pipe(catout);
    process.stderr.pipe(caterr);
    process.on('close', code => {
      // if (stderr) console.error(stderr);
      if (code === 0) resolve(stdout);
      else reject(new Error('Exited with non-zero status code'));
    });
  });
};

/**
 * Converts a PDF file to TIFF/PNG using ImageMagick.
 * ImageMagick and Ghostscript must be installed on the system.
 * @param {Readable} inputStream Content of the input file.
 * @param {{ resolution: number, outType: string }} options
 */
const convertImage = async (inputStream, options = {}) => {
  const { resolution = 600, outType = 'png' } = options;

  const [command, subCommand] = (() => {
    const magick = process.env.RON_MAGICK;
    if (magick === '6') return ['convert', []];
    if (!magick || magick === '7') return ['magick', ['convert']];
    return ['docker', ['run', '-i', '--rm', magick]];
  })();

  // PDF files will be rasterized using this resolution
  const rasterResolutionOption = /\.pdf$/i.test('abc')
    ? ['-density', resolution]
    : [];

  // prettier-ignore
  const args = [
    ...subCommand,
    ...rasterResolutionOption,
    '-', // Read from stdin
    '-units', 'PixelsPerInch', // Specifying this is important
    '-density', resolution, // Set output resolution of rasterized image
    `${outType}:-` // Output to stdout
  ];

  const output = await exec(command, args, inputStream);
  return output;
};

export default convertImage;
