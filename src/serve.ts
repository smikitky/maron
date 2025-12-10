import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { streamSSE } from 'hono/streaming';
import getPort from 'get-port';
import { EventEmitter } from 'node:events';
import { serve } from '@hono/node-server';

const serveApp = async (outDir: string, notify: EventEmitter) => {
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

  app.use(
    '/*',
    serveStatic({
      root: outDir
    })
  );

  const port = await getPort({ port: [3000, 3001, 3002, 3003, 3004, 3005] });
  serve({ fetch: app.fetch, port });
  console.log(`Serving on http://127.0.0.1:${port}/`);

  return notify;
};

export default serveApp;
