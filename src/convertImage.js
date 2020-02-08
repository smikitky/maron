import cp from 'child_process';
import concat from 'concat-stream';
import { Readable } from 'stream';

const exec = async (command, args, stdin) => {
  return new Promise((resolve, reject) => {
    const process = cp.spawn(command, args);
    stdin.pipe(process.stdin);
    let result;
    const cat = concat(buffer => (result = buffer));
    process.stdout.pipe(cat);
    process.on('close', code => {
      if (code === 0) resolve(result);
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

  const magick6 = process.env.IMAGEMAGICK_VERSION === '6';
  const command = magick6 ? 'convert' : 'magick';
  const subCommand = magick6 ? [] : ['convert'];

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
