import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { streamSSE } from 'hono/streaming';
import getPort from 'get-port';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { serve } from '@hono/node-server';
import type { ResolvedSourceEntry } from './types.ts';

const toStaticRoot = (outDir: string) => {
  const relative = path.relative(process.cwd(), outDir);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Output dir must be under current directory: ${outDir}`);
  }
  return relative || '.';
};

const serveApp = async (entries: ResolvedSourceEntry[], notify: EventEmitter) => {
  const app = new Hono();

  app.get('/updates', c =>
    streamSSE(c, async stream => {
      const handler = () => stream.writeSSE({ event: 'change', data: 'change' });
      notify.on('change', handler);
      const timerId = setInterval(() => stream.writeSSE({ data: '' }), 1500);
      stream.onAbort(() => {
        notify.off('change', handler);
        clearInterval(timerId);
      });
    })
  );

  const mainEntry = entries.find(entry => entry.isMain);
  if (!mainEntry) {
    throw new Error('Main source entry is required.');
  }

  const nonMainEntries = entries.filter(entry => !entry.isMain);
  for (const entry of nonMainEntries) {
    const root = toStaticRoot(entry.outDir);
    const prefix = entry.routePath;
    app.get(prefix, c => c.redirect(`${prefix}/`));
    app.use(
      `${prefix}/*`,
      serveStatic({
        root,
        rewriteRequestPath: reqPath => reqPath.slice(prefix.length) || '/'
      })
    );
  }

  app.use(
    '/*',
    serveStatic({
      root: toStaticRoot(mainEntry.outDir)
    })
  );

  const port = await getPort({ port: [3000, 3001, 3002, 3003, 3004, 3005] });
  serve({ fetch: app.fetch, port });
  console.log(`Serving on http://127.0.0.1:${port}/`);

  return notify;
};

export default serveApp;
