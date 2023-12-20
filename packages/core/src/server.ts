import fastify from 'fastify';
import { AyazmoInstance } from '@ayazmo/types';
import pino from 'pino';
import { loadAndRegisterPlugins } from './plugin-manager';

const coreLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

export class Server {
  private fastify: AyazmoInstance;

  constructor() {
    this.fastify = fastify({
      logger: coreLogger
    });
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Define your core routes here, e.g., health checks or basic info
    this.fastify.get('/health', async (request, reply) => {
      reply.code(200).send({ status: 'ok' });
    });
  }

  async start(port: number): Promise<void> {
    await loadAndRegisterPlugins(this.fastify);
    this.fastify.listen({ port }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Server listening on ${address}`);
    });
  }
}
