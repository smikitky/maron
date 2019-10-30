import cp from 'child_process';
import util from 'util';

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
 * Converts a PDF file to TIFF using ImageMagick.
 * ImageMagick and Ghostscript must be installed on the system.
 * @param {string} pdfFile
 * @param {string} outFile
 * @param {object} options
 */
const convertToTiff = async (pdfFile, outFile, options = {}) => {
  const { resolution = 600 } = options;
  // prettier-ignore
  const { code } = await exec('magick', [
    'convert',
    '-density', resolution, // Rasterize using this resolution
    pdfFile,
    '-units', 'PixelsPerInch', // Specifying this is important
    '-density', resolution, // Set output resolution
    outFile
  ]);
  return code === 0;
};

export default convertToTiff;
