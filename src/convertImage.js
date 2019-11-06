import cp from 'child_process';

// const exec = util.promisify(cp.exec);

const exec = async (command, args) => {
  return new Promise(resolve => {
    const p = cp.spawn(command, args);
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', data => (stdout += data));
    p.stderr.on('data', data => (stderr += data));
    p.on('close', code => resolve({ stdout, stderr, code }));
  });
};

/**
 * Converts a PDF file to TIFF/PNG using ImageMagick.
 * ImageMagick and Ghostscript must be installed on the system.
 * @param {string} inFile Input file path.
 * @param {string} outFile Output file path.
 * @param {{ resolution: number }} options
 */
const convertImage = async (inFile, outFile, options = {}) => {
  const { resolution = 600 } = options;

  const magick6 = process.env.IMAGEMAGICK_VERSION === '6';
  const command = magick6 ? 'convert' : 'magick';
  const subCommand = magick6 ? [] : ['convert'];

  // PDF files will be rasterized using this resolution
  const rasterResolutionOption = /\.pdf$/i.test(inFile)
    ? ['-density', resolution]
    : [];

  // prettier-ignore
  const { code, stderr } = await exec(command, [
    ...subCommand,
    ...rasterResolutionOption,
    inFile,
    '-units', 'PixelsPerInch', // Specifying this is important
    '-density', resolution, // Set output resolution of rasterized image
    outFile
  ]);
  if (code !== 0) throw new Error(stderr);
  return code === 0;
};

export default convertImage;
