import fs from 'node:fs/promises';

const readFileIfExists = async (file: string) => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
};

export default readFileIfExists;
