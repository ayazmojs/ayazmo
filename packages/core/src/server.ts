import fastify from 'fastify';
import { AyazmoInstance } from '@ayazmo/types';
import pino from 'pino';
import path from 'path';
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix';
import { loadConfig } from './loaders/config.js';
import mercurius from 'mercurius';
import { loadPlugins } from './plugins/plugin-manager.js';

const SHUTDOWN_TIMEOUT = 30 * 1000; // 30 seconds, for example

const coreLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

const rootDir = process.cwd(); // Get the current working directory
const configDir = path.join(rootDir, 'ayazmo.config.js'); // Adjust this path as needed

export class Server {
  private fastify: AyazmoInstance;

  constructor() {
    this.fastify = fastify({
      logger: coreLogger
    });
    this.fastify.register(fastifyAwilixPlugin, { disposeOnClose: true, disposeOnResponse: true })
    this.initializeRoutes();
    this.fastify.register(mercurius, {
      schema: 'type Query { health: Boolean }',
      resolvers: {
        Query: {
          health: async (_, { }) => true,
        },
      },
    });
    this.setupGracefulShutdown();
  }

  private initializeRoutes(): void {
    // Define your core routes here
    this.fastify.get('/health', async (request, reply) => {
      reply.code(200).send({ status: 'ok' });
    });
  }

  private async shutdownServer() {
    const shutdownInitiated = Date.now();

    try {
      // Initiate graceful shutdown tasks here, e.g., closing database connections

      // Create a promise that resolves when the server closes
      const serverClosed = new Promise((resolve) => {
        this.fastify.close(() => resolve(true));
      });

      // Create a timeout promise
      const timeout = new Promise((resolve) => {
        const timeLeft = SHUTDOWN_TIMEOUT - (Date.now() - shutdownInitiated);
        setTimeout(() => resolve(false), timeLeft);
      });

      // Wait for either the server to close or the timeout, whichever comes first
      const shutdownCompleted = await Promise.race([serverClosed, timeout]);

      if (shutdownCompleted) {
        this.fastify.log.info('Server has been shut down gracefully');
      } else {
        this.fastify.log.warn('Server shutdown timed out; forcing shutdown');
        process.exit(1); // Exit with a failure code
      }
    } catch (err) {
      // Handle errors that occurred during shutdown
      this.fastify.log.error('Error during server shutdown', err);
      process.exit(1);
    }
  }


  private setupGracefulShutdown() {
    // Listen for termination signals
    process.on('SIGINT', () => this.shutdownServer());
    process.on('SIGTERM', () => this.shutdownServer());
  }

  public async loadPlugins(): Promise<void> {
    // load config
    await loadConfig(configDir, this.fastify, diContainer);

    // load plugins
    await loadPlugins(this.fastify, diContainer);
  }

  async start(port: number): Promise<void> {
    // load plugins
    await this.loadPlugins();

    try {
      await this.fastify.listen({ port });
    } catch (err) {
      this.fastify.log.error(err);
      process.exit(1);
    }
  }
}
