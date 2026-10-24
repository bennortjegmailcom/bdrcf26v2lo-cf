import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import app from './app';
import { requestContext } from './context/requestContext';

const server = createServer((req, res) => {
  requestContext.run({ env }, () => app(req, res));
});
server.listen(3000);
export default httpServerHandler({ port: 3000 });
