import pino from 'pino'
import type { AyazmoInstance } from '@ayazmo/types'
import { createTestConfig, cleanupTestConfig } from './config-registry.js'

// Import the Server class directly from @ayazmo/core
import { Server } from '@ayazmo/core'

/**
 * Default base configuration with required settings
 */
const DEFAULT_CONFIG = {
  app: {
    server: {
      port: 0, // Use port 0 to automatically select an available port
      host: '0.0.0.0'
    }
    // Add other required app settings here
  }
}

/**
 * Configuration options for test server
 */
export interface TestServerOptions {
  /**
   * Base directory for temporary config files (relative to process.cwd())
   * Defaults to '__tests__/temp-configs'
   */
  configBaseDir?: string;
  
  /**
   * Log level for test server
   * If not specified, uses LOG_LEVEL environment variable or 'info'
   */
  logLevel?: string;
}

/**
 * Create a Pino logger instance for tests
 * @param level - Log level to use
 * @returns Configured Pino logger
 */
function createTestLogger(level: string = 'info') {
  return pino({
    level: process.env.LOG_LEVEL || level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
}

/**
 * Get defaults for test server options
 * 
 * @param options - User-provided options
 * @returns Resolved options with defaults
 */
function getDefaults(options: TestServerOptions): TestServerOptions {
  // Build the result with user options taking precedence
  const result: TestServerOptions = { ...options }
  
  // Default config directory to __tests__/temp-configs in current working directory
  if (!result.configBaseDir) {
    result.configBaseDir = '__tests__/temp-configs'
  }
  
  // Log level will default to environment variable in the logger creation
  
  return result
}

/**
 * Build a server instance with a temporary test configuration
 * 
 * @param testName - Identifier for the test
 * @param testConfig - Test-specific configuration
 * @param options - Additional options for the test server
 * @returns Server instance with additional test helpers
 */
export async function buildTestServer(
  testName: string, 
  testConfig: Record<string, any> = {}, 
  options: TestServerOptions = {}
) {
  // Apply defaults to options
  const resolvedOptions = getDefaults(options)
  
  // Merge test config with default config
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...testConfig,
    app: {
      ...DEFAULT_CONFIG.app,
      ...(testConfig.app || {})
    }
  }
  
  // Create temporary config file
  const configPath = await createTestConfig(testName, mergedConfig, {
    baseDir: resolvedOptions.configBaseDir
  })
  
  // Create logger for the test
  const logger = createTestLogger(resolvedOptions.logLevel)
  logger.info(`Test server being built for "${testName}" with config at ${configPath}`)
  
  // Create server instance with logger
  const server = new Server({ 
    configPath, 
    logger
  })
  
  // Add test helpers to the server
  return Object.assign(server, {
    /**
     * Path to the temporary config file
     */
    configPath,
    
    /**
     * The logger instance
     */
    logger,
    
    /**
     * Start the server and return the instance
     */
    async startAndGetInstance(): Promise<AyazmoInstance> {
      logger.info('Starting test server...')
      try {
        await server.start()
        const instance = server.getServerInstance()
        const address = instance.server.address()
        // Handle different address types safely
        const port = typeof address === 'string' ? '(custom socket)' : address?.port || 'unknown'
        logger.info(`Server started successfully on port ${port}`)
        return instance
      } catch (error) {
        logger.error('Failed to start server:', error)
        throw error
      }
    },
    
    /**
     * Clean up server resources and temp files
     */
    async cleanup(): Promise<void> {
      logger.info('Cleaning up test server...')
      try {
        const instance = server.getServerInstance()
        if (instance && instance.server && instance.server.listening) {
          await instance.close()
          logger.info('Server closed successfully')
        }
      } catch (error) {
        logger.error('Error closing server instance:', error)
      }
      
      try {
        await cleanupTestConfig(configPath)
        logger.info('Test config cleaned up')
      } catch (error) {
        logger.error('Error cleaning up config:', error)
      }
    }
  })
} 