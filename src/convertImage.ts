import * as cp from 'node:child_process';
import { buffer } from 'node:stream/consumers';
import { type Readable } from 'node:stream';

const exec = async (command: string, args: string[], stdin: Readable) => {
  const process = cp.spawn(command, args);
  stdin.pipe(process.stdin);
  const [stdout, stderr, code] = await Promise.all([
    buffer(process.stdout),
    buffer(process.stderr),
    new Promise<number>(resolve => process.on('close', resolve))
  ]);

  if (code === 0) return stdout;

  throw new Error(
    'Exited with non-zero status code\n' + stderr.toString('utf8')
  );
};

interface ConvertImageOptions {
  resolution?: number;
  outType?: 'png' | 'tiff';
}

/**
 * Converts a PDF file to TIFF/PNG using ImageMagick.
 * ImageMagick and Ghostscript must be installed on the system.
 * @param inputStream - Content of the input file.
 * @param options - Options
 */
const convertImage = async (
  inputStream: Readable,
  options: ConvertImageOptions = {}
) => {
  const { resolution = 600, outType = 'png' } = options;

  const [command, subCommand] = (() => {
    const magick = process.env.RON_MAGICK;
    if (magick === '6') return ['convert', []];
    if (!magick || magick === '7') return ['magick', ['convert']];
    return ['docker', ['run', '-i', '--rm', magick]];
  })();

  // PDF files will be rasterized using this resolution
  const rasterResolutionOption = resolution
    ? ['-density', String(resolution)]
    : [];

  const compressOption = outType === 'tiff' ? ['-compress', 'lzw'] : [];

  // prettier-ignore
  const args = [
    ...subCommand,
    ...rasterResolutionOption,
    '-', // Read from stdin
    '-units', 'PixelsPerInch', // Specifying this is important
    // '-density', resolution, // Set output resolution of rasterized image
    ...compressOption,
    `${outType}:-` // Output to stdout
  ];

  const output = await exec(command, args, inputStream);
  return output;
};

export default convertImage;
