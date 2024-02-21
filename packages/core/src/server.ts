import fastify, { FastifyInstance, FastifyRequest, FastifyReply, type FastifyBaseLogger } from 'fastify'
import { FastifyAuthFunction, fastifyAuth } from '@fastify/auth'
import cors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import pino from 'pino'
import path from 'node:path'
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix'
import { loadConfig } from './loaders/config.js'
import mercurius from 'mercurius'
import mercuriusAuth from 'mercurius-auth'
import { loadPlugins } from './plugins/plugin-manager.js'
import { loadCoreServices } from './loaders/core/services.js'
import anonymousStrategy from './auth/AnonymousStrategy.js'
import os from 'os'
import { AppConfig } from '@ayazmo/types'

const SHUTDOWN_TIMEOUT = 5 * 1000 // 5 seconds, for example

const coreLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
})

const rootDir = process.cwd()
const configDir = path.join(rootDir, 'ayazmo.config.js')
export class Server {
  private readonly fastify: FastifyInstance

  constructor() {
    this.fastify = fastify({
      logger: coreLogger as FastifyBaseLogger
    })
    this.fastify
      .decorate('anonymousStrategy', anonymousStrategy)
      .register(fastifyAuth)

    this.fastify.register(fastifyAwilixPlugin, { disposeOnClose: true })
    this.initializeRoutes()
    this.registerGQL()
    this.setupGracefulShutdown()
    // Set the default error handler
    this.setDefaultErrorHandler()
  }

  // Method to set the default error handler
  private setDefaultErrorHandler() {
    this.fastify.setErrorHandler((error, request, reply) => {
      // Default error handling logic
      if (error.validation != null) {
        reply.status(400).send(error)
      } else {
        request.log.error(error)
        if ('statusCode' in error && error.statusCode) {
          // It's a Fastify error, send the error message with the status code
          reply.status(error.statusCode).send({ message: error.message })
        } else {
          // It's a generic error, log it and send a generic error message
          reply.status(500).send({ message: 'Internal Server Error' })
        }
      }
    })
  }

  // Public method to allow custom error handler to be set
  public setErrorHandler(customErrorHandler: (error: Error, request: FastifyRequest, reply: FastifyReply) => void) {
    this.fastify.setErrorHandler(customErrorHandler)
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
          health: async (_, { }) => true
        },
        Mutation: {
          health: async (_, { }) => true
        }
      }
    })
  }

  public registerAuthDirective() {
    this.fastify.register(mercuriusAuth, {
      applyPolicy: async (authDirectiveAST, parent, args, context, info) => {
        const strategies: string[] = authDirectiveAST.arguments[0].value.values.map(value => value.value)
        const runStrategies: any[] = []
        let shouldThrow: boolean = false

        strategies.forEach(authStrategy => {
          if (!this.fastify[authStrategy]) {
            console.warn(`Auth strategy '${authStrategy}' does not exist.`)
            return
          }

          runStrategies.push(this.fastify[authStrategy])
        })

        const auth: FastifyAuthFunction = this.fastify.auth(runStrategies)
        // @ts-expect-error
        auth(context.reply.request, context.reply, (error: Error) => {
          if (error) {
            shouldThrow = true
          }
        })

        if (shouldThrow) {
          const authError = new mercurius.ErrorWithProps('UNAUTHORIZED')
          authError.statusCode = 401 // Use the appropriate status code for unauthorized
          throw authError
        }

        return true
      },
      authContext: async (context) => { },
      authDirective: 'auth'
    })
  }

  private initializeRoutes(): void {
    // Define core routes here
    this.fastify.get('/health', async (request, reply) => {
      reply.code(200).send({ status: 'ok' })
    })
  }

  private async shutdownServer() {
    const shutdownInitiated = Date.now()

    try {
      // Initiate graceful shutdown tasks here, e.g., closing database connections
      diContainer.dispose()

      // Create a promise that resolves when the server closes
      const serverClosed = new Promise((resolve) => {
        this.fastify.close(() => resolve(true))
      })

      // Create a timeout promise
      const timeout = new Promise((resolve) => {
        const timeLeft = SHUTDOWN_TIMEOUT - (Date.now() - shutdownInitiated)
        setTimeout(() => resolve(false), timeLeft)
      })

      // Wait for either the server to close or the timeout, whichever comes first
      const shutdownCompleted = await Promise.race([serverClosed, timeout])

      if (shutdownCompleted) {
        this.fastify.log.info(`Server has been shut down gracefully${os.EOL}`)
        process.exit(0) // Exit with a success code
      } else {
        this.fastify.log.warn('Server shutdown timed out; forcing shutdown')
        process.exit(1) // Exit with a failure code
      }
    } catch (err) {
      // Handle errors that occurred during shutdown
      this.fastify.log.error('Error during server shutdown', err)
      process.exit(1)
    }
  }

  private async enableCORS() {
    const config = diContainer.resolve('config') as AppConfig;
    await this.fastify.register(cors, config.app.cors)
  }

  private enableCookies() {
    this.fastify.register(fastifyCookie, {
      hook: 'preParsing'
    })
  }

  private setupGracefulShutdown() {
    // Listen for termination signals
    process.on('SIGINT', async () => await this.shutdownServer())
    process.on('SIGTERM', async () => await this.shutdownServer())
  }

  public async loadPlugins(): Promise<void> {
    // load config
    await loadConfig(configDir, this.fastify, diContainer)

    // load ayazmo services
    await loadCoreServices(this.fastify, diContainer)

    // load plugins
    await loadPlugins(this.fastify, diContainer)

    this.registerAuthDirective()
  }

  async start(port: number): Promise<void> {
    this.enableCookies()
    // load plugins
    await this.loadPlugins()

    await this.enableCORS()

    try {
      await this.fastify.listen({ port })
    } catch (err) {
      this.fastify.log.error(err)
      process.exit(1)
    }
  }
}
