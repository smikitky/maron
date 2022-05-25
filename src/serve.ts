import Koa from 'koa';
import koaStatic from 'koa-static';
import getPort from 'get-port';
import { PassThrough } from 'stream';
import { EventEmitter } from 'events';

const notifyUpdates = (notify: EventEmitter): Koa.Middleware => {
  return async (ctx, next) => {
    const stream = new PassThrough();
    const handler = () => {
      stream.write('event: change\ndata: change\n\n');
    };
    notify.on('change', handler);
    const timerId = setInterval(() => stream.write(':\n\n'), 1500);
    const clear = () => {
      notify.off('change', handler);
      clearInterval(timerId);
    };
    stream.on('close', clear);
    stream.on('error', clear);
    ctx.type = 'text/event-stream';
    ctx.body = stream;
  };
};

const serve = async (outDir: string, notify: EventEmitter) => {
  const app = new Koa();
  const notifyMiddleware = notifyUpdates(notify);
  app.use(async (ctx, next) => {
    if (ctx.path === '/updates') {
      await notifyMiddleware(ctx, next);
    } else {
      await next();
    }
  });
  app.use(koaStatic(outDir));

  const port = await getPort({ port: [3000, 3001, 3002, 3003, 3004, 3005] });
  app.listen({ port });
  console.log(`Serving on http://127.0.0.1:${port}/`);

  return notify;
};

export default serve;
