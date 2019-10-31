import fs from 'fs-extra';

const readFileIfExists = async file => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
};

export default readFileIfExists;
