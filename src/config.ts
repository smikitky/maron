import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatZodError, maronConfigSchema } from './schema.ts';
import type { MaronConfig, ResolvedSourceEntry } from './types.ts';

const normalizeFromConfig = (
  cwd: string,
  config: MaronConfig
): ResolvedSourceEntry[] => {
  const parsed = maronConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(formatZodError('maron.config.js', parsed.error));
  }
  const { sources } = parsed.data;

  const sourceEntries = Object.entries(sources);

  let mainName: string | null = null;
  for (const [name, source] of sourceEntries) {
    if (source.main) {
      mainName = name;
      break;
    }
  }
  if (!mainName) {
    mainName = sourceEntries[0][0];
  }

  const outRoot = path.resolve(cwd, 'out');
  return sourceEntries.map(([name, source]) => {
    const isMain = name === mainName;
    return {
      name,
      isMain,
      routePath: isMain ? '/' : `/${name}`,
      sourceDir: path.resolve(cwd, source.src),
      outDir: isMain ? outRoot : path.join(outRoot, name)
    };
  });
};

const loadConfig = async (cwd: string): Promise<MaronConfig | null> => {
  const configFile = path.join(cwd, 'maron.config.js');
  try {
    await fs.stat(configFile);
  } catch {
    return null;
  }
  const moduleUrl = pathToFileURL(configFile).href;
  const mod = await import(moduleUrl);
  return mod.default as MaronConfig;
};

const defaultEntry = (cwd: string): ResolvedSourceEntry[] => [
  {
    name: 'main',
    isMain: true,
    routePath: '/',
    sourceDir: path.resolve(cwd, 'src'),
    outDir: path.resolve(cwd, 'out')
  }
];

const resolveSourceEntries = async (
  cwd = process.cwd()
): Promise<ResolvedSourceEntry[]> => {
  const config = await loadConfig(cwd);
  if (!config) return defaultEntry(cwd);
  return normalizeFromConfig(cwd, config);
};

export default resolveSourceEntries;

export const __testing = {
  normalizeFromConfig
};
