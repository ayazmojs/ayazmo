import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import { FastifyAuthFunction, fastifyAuth } from '@fastify/auth'
import cors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import path from 'node:path'
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix'
import { loadConfig } from './loaders/config.js'
import mercurius from 'mercurius'
import mercuriusAuth from 'mercurius-auth'
import { loadPlugins } from './plugins/plugin-manager.js'
import { loadCoreServices } from './loaders/core/services.js'
import anonymousStrategy from './auth/AnonymousStrategy.js'
import userAuthChain from './auth/userAuthChain.js'
import os from 'os'
import { AppConfig, ServerOptions, AyazmoInstance, RoleCheckFunction } from '@ayazmo/types'
import fastifyRedis from '@fastify/redis'
import { GLOBAL_CONFIG_FILE_NAME, AyazmoError } from '@ayazmo/utils'
import { initCacheableDecorator } from './decorators/cacheable.js'
import { ConfigService } from './config/ConfigService.js'

const SHUTDOWN_TIMEOUT = 5 * 1000

const rootDir = process.env.AYAZMO_ROOT_DIR ?? process.cwd()
const configDir = path.join(rootDir, GLOBAL_CONFIG_FILE_NAME)
export class Server {
  private readonly fastify: AyazmoInstance
  private configService!: ConfigService; // Using definite assignment assertion

  constructor (options: ServerOptions = {}) {
    const { configPath, ...restOptions } = options
    this.fastify = fastify(restOptions)
    this.fastify.decorate('configPath', configPath ?? configDir)
    this.fastify.decorate('anonymousStrategy', anonymousStrategy)
      .register(fastifyAuth)
    this.registerGQL()
    this.setupGracefulShutdown()
    this.setDefaultErrorHandler()
  }

  private registerAdminRoles (): void {
    const adminRoles = this.configService.get('admin.roles') as Record<string, RoleCheckFunction> | undefined;

    if (adminRoles) {
      Object.entries(adminRoles).forEach(([roleName, checkUserRole]) => {
        this.fastify.decorate(roleName, (request: FastifyRequest, reply: FastifyReply, done: any) => {
          const roleIsAllowed: boolean = checkUserRole(request.admin)

          if (roleIsAllowed) {
            done()
          } else {
            done(AyazmoError({
              statusCode: 403,
              message: 'Unauthorized',
              code: 'UNAUTHORIZED'
            }))
          }
        })
      })
    }
  }

  getServerInstance (): AyazmoInstance {
    return this.fastify
  }

  private setDefaultErrorHandler (): void {
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

  public setErrorHandler (customErrorHandler: (error: Error, request: FastifyRequest, reply: FastifyReply) => void) {
    this.fastify.setErrorHandler(customErrorHandler)
  }

  public registerGQL () {
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
          health: async () => true
        },
        Mutation: {
          health: async () => true
        }
      }
    })
  }

  public registerAuthDirective () {
    this.fastify.register(mercuriusAuth, {
      applyPolicy: async (authDirectiveAST, parent, args, context) => {
        const strategies: string[] = authDirectiveAST.arguments[0].value.values.map(value => value.value)
        const runStrategies: FastifyAuthFunction[] = []
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
          authError.statusCode = 401
          throw authError
        }

        return true
      },
      authContext: async () => { },
      authDirective: 'auth'
    })
  }

  public initializeHealthRoute (): void {
    if (!this.fastify.hasRoute({
      method: 'GET',
      url: '/health'
    })) {
      this.fastify.get('/health', async (request, reply) => {
        reply.code(200).send({ status: 'ok' })
      })
    }
  }

  private async shutdownServer () {
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

  private async enableCORS (): Promise<void> {
    const corsConfig = this.configService.get('app.cors');
    if (corsConfig) {
      await this.fastify.register(cors, corsConfig)
    }
  }

  private enableCookies (): void {
    this.fastify.register(fastifyCookie, {
      hook: 'preParsing'
    })
  }

  public async maybeEnableRedis (opts?: null | any): Promise<void> {
    const redisConfig = this.configService.get('app.redis');
    if (redisConfig || opts) {
      await this.fastify.register(fastifyRedis, redisConfig ?? opts)
    }
  }

  public async enableWebSockets (opts?: null | any): Promise<void> {
    const websocketConfig = this.configService.get('app.websocket');
    if (websocketConfig || opts) {
      const websocket = await import('@fastify/websocket')
      await this.fastify.register(websocket.default, websocketConfig ?? opts)
      this.fastify.log.info('WebSocket support enabled')
    }
  }

  public async enableUserAuthChain (): Promise<void> {
    if (!this.fastify.hasDecorator('auth')) {
      this.fastify.log.warn('app auth decorator not found, skipping auth providers')
      return
    }
    if (this.fastify.hasDecorator('userAuthChain')) {
      this.fastify.log.warn('userAuthChain decorator found, skipping auth providers');
      return;
    }
    
    // Get the full config object for userAuthChain which expects the full config
    const config = this.configService.getConfig() as AppConfig;
    this.fastify
      .decorate('userAuthChain', userAuthChain(this.fastify, config))
  }

  public async loadConfig (): Promise<void> {
    // Check if both config and configService are already registered
    if (!this.fastify.diContainer.hasRegistration('config') || 
        !this.fastify.diContainer.hasRegistration('configService')) {
      await loadConfig(this.fastify)
    }
  }

  /**
   * Initializes the entire configuration system by loading config and setting up ConfigService
   * This is a convenience method that combines loadConfig and ConfigService initialization
   * 
   * @returns The initialized ConfigService instance
   */
  public async initializeConfiguration(): Promise<ConfigService> {
    // First load the configuration
    await this.loadConfig()
    
    // Then get and assign the ConfigService instance
    this.configService = ConfigService.getInstance(this.fastify)
    
    // Return the instance for convenience
    return this.configService
  }

  public async loadDiContainer (): Promise<void> {
    if (!this.fastify.hasDecorator('diContainer')) {
      await this.fastify.register(fastifyAwilixPlugin, { disposeOnClose: true })
    }
  }

  public async loadCoreServices (): Promise<void> {
    await loadCoreServices(this.fastify)
  }

  private setupGracefulShutdown () {
    // Listen for termination signals
    process.on('SIGINT', async () => await this.shutdownServer())
    process.on('SIGTERM', async () => await this.shutdownServer())

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      // Check if reason is an Error and log its stack for more details
      this.fastify.log.error('unhandledRejection:')
      if (reason instanceof Error) {
        this.fastify.log.error(reason.stack)
      } else {
        this.fastify.log.error(reason)
      }

      // Perform a graceful shutdown
      this.shutdownServer().catch(err => {
        this.fastify.log.error('Failed to shutdown the server gracefully', err)
        process.exit(1) // Exit with a failure code
      })
    })
  }

  public async loadPlugins (): Promise<void> {
    // load ayazmo services
    await this.loadCoreServices()

    // load plugins
    await loadPlugins(this.fastify)
  }

  async start (): Promise<void> {
    try {
      this.enableCookies()
      await this.loadDiContainer()
      
      // Initialize configuration using our new method
      await this.initializeConfiguration()
      
      await this.registerAdminRoles()
      await this.maybeEnableRedis()
      await this.enableWebSockets()
      await this.loadPlugins()
      
      // Initialize cache decorators after core services are loaded
      if (this.fastify.diContainer.hasRegistration('cacheService')) {
        initCacheableDecorator(this.fastify);
        this.fastify.log.info('Cache decorators initialized');
      }
      
      // load auth providers after loading plugins
      this.enableUserAuthChain()
      this.registerAuthDirective()
      await this.enableCORS()
      this.initializeHealthRoute()
      
      // Validate configuration on server startup
      const validation = this.configService.validate();
      if (!validation.valid) {
        this.fastify.log.error('Configuration validation failed:')
        validation.errors.forEach(error => this.fastify.log.error(`- ${error}`))
        // Always fail on validation errors with descriptive message
        throw new Error(`Invalid configuration. Server stopped.\nValidation errors:\n${validation.errors.join('\n')}`)
      } else {
        this.fastify.log.info('Configuration validation successful')
      }

      // Get server configuration with ConfigService
      const serverConfig = this.configService.get('app.server');
      await this.fastify.listen(serverConfig)
      await this.fastify.ready()
    } catch (err) {
      this.fastify.log.error(err)
      process.exit(1)
    }
  }
}
