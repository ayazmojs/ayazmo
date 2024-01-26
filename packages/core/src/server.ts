import fastify from 'fastify';
import { FastifyAuthFunction } from '@fastify/auth';
import { AyazmoInstance, FastifyRequest } from '@ayazmo/types';
import pino from 'pino';
import path from 'path';
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix';
import { loadConfig } from './loaders/config.js';
import mercurius from 'mercurius';
import mercuriusAuth from 'mercurius-auth';
import { loadPlugins } from './plugins/plugin-manager.js';
import { loadCoreServices } from './loaders/core/services.js';
import { fastifyAuth } from '@fastify/auth'
import { validateJwtStrategy } from './auth/JwtStrategy.js';
import { validateApitokenStrategy } from './auth/ApiTokenStrategy.js';
import { validatePasswordStrategy } from './auth/PasswordStrategy.js';
import anonymousStrategy from './auth/AnonymousStrategy.js';

const SHUTDOWN_TIMEOUT = 5 * 1000; // 5 seconds, for example

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
    this.fastify
      .decorate('jwtStrategy', async (request: FastifyRequest) => {
        await validateJwtStrategy(request);
      })
      .decorate('apiTokenStrategy', async (request: FastifyRequest) => {
        await validateApitokenStrategy(request);
      })
      .decorate('passwordStrategy', async (request: FastifyRequest) => {
        await validatePasswordStrategy(request);
      })
      .decorate('anonymousStrategy', anonymousStrategy)
      .register(fastifyAuth)
    this.fastify.register(fastifyAwilixPlugin, { disposeOnClose: true })
    this.initializeRoutes();
    this.registerGQL();
    this.setupGracefulShutdown();
  }

  public registerGQL() {
    this.fastify.register(mercurius, {
      schema: `
        directive @auth(strategies: [String]) on OBJECT | FIELD_DEFINITION

        type Query {
          health: Boolean
        }
        type Mutation {
          health: Boolean
        }
      `,
      resolvers: {
        Query: {
          health: async (_, { }) => true,
        },
        Mutation: {
          health: async (_, { }) => true,
        },
      },
    });
  }

  public registerAuthDirective() {
    this.fastify.register(mercuriusAuth, {
      // @ts-ignore
      applyPolicy: async (authDirectiveAST, parent, args, context, info) => {
        const strategies: string[] = authDirectiveAST.arguments[0].value.values.map(value => value.value);
        let runStrategies: any[] = [];
        let shouldThrow: boolean = false;

        strategies.forEach(authStrategy => {
          if (!this.fastify[authStrategy]) {
            console.warn(`Auth strategy '${authStrategy}' does not exist.`);
            return;
          }

          runStrategies.push(this.fastify[authStrategy]);
        });

        const auth: FastifyAuthFunction = this.fastify.auth(runStrategies);
        // @ts-ignore
        auth(context.reply.request, context.reply, (error: Error) => {
          if (error) {
            shouldThrow = true;
          }
        });

        if (shouldThrow) {
          const authError = new mercurius.ErrorWithProps('UNAUTHORIZED');
          authError.statusCode = 401; // Use the appropriate status code for unauthorized
          throw authError;
        }

        return true;
      },
      authContext: async (context) => {},
      authDirective: 'auth',
    });
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
      diContainer.dispose();

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
        process.exit(0); // Exit with a success code
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

    // load ayazmo services
    await loadCoreServices(this.fastify, diContainer)

    // load plugins
    await loadPlugins(this.fastify, diContainer);

    this.registerAuthDirective();
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
