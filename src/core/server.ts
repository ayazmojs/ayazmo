import Fastify, { FastifyInstance } from 'fastify';
import { loadAndRegisterPlugins } from './plugin-manager';

export class Server {
  private fastify: FastifyInstance;

  constructor() {
    this.fastify = Fastify({ logger: true });
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Define your core routes here, e.g., health checks or basic info
    this.fastify.get('/health', async (request, reply) => {
      return { status: 'ok' };
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
