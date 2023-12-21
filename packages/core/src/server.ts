import fastify from 'fastify';
import { AyazmoInstance } from '@ayazmo/types';
import pino from 'pino';
import path from 'path';
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix';
import { loadRoutesFromPlugin, loadServicesFromPlugin } from './plugin-manager';

const coreLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

const rootDir = process.cwd(); // Get the current working directory
const pluginsDir = path.join(rootDir, 'dist/plugins'); // Adjust this path as needed

export class Server {
  private fastify: AyazmoInstance;

  constructor() {
    this.fastify = fastify({
      logger: coreLogger
    });
    this.fastify.register(fastifyAwilixPlugin, { disposeOnClose: true, disposeOnResponse: true })
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Define your core routes here, e.g., health checks or basic info
    this.fastify.get('/health', async (request, reply) => {
      reply.code(200).send({ status: 'ok' });
    });
  }

  async start(port: number): Promise<void> {
    await loadServicesFromPlugin(pluginsDir, this.fastify, diContainer);
    await loadRoutesFromPlugin(pluginsDir, this.fastify);
    this.fastify.listen({ port }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Server listening on ${address}`);
    });
  }
}
