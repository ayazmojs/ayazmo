import { validateEnvVars, generateEnvTemplate, importGlobalConfig } from '@ayazmo/utils'
import path from 'node:path'
import CliLogger from './cli-logger.js'

/**
 * Validates environment variables in the current project
 * @param options Command options
 */
export async function validateConfig(options: { template?: boolean, output?: string }) {
  try {
    // Get the config path - typically ayazmo.config.js in the project root
    const configPath = path.join(process.cwd(), 'ayazmo.config.js')
    
    // Attempt to load the configuration
    let config
    try {
      config = await importGlobalConfig(configPath)
    } catch (error) {
      CliLogger.error(`Error loading configuration from ${configPath}: ${error.message}`)
      process.exit(1)
    }
    
    // Validate environment variables
    const results = validateEnvVars(config)
    
    // Display results
    CliLogger.info('\nAyazmo Environment Variable Validation')
    CliLogger.info('=====================================\n')
    
    if (results.valid.length > 0) {
      CliLogger.success('✅ Valid environment variables:')
      results.valid.forEach(v => CliLogger.info(`   ${v}`))
      CliLogger.info('')
    }
    
    if (results.invalid.length > 0) {
      CliLogger.warn('⚠️  Invalid environment variables:')
      results.invalid.forEach(v => CliLogger.warn(`   ${v}`))
      CliLogger.info('')
    }
    
    if (results.unused.length > 0) {
      CliLogger.info('ℹ️  Unused environment variables:')
      results.unused.forEach(v => CliLogger.info(`   ${v}`))
      CliLogger.info('')
    }
    
    // Generate template if requested
    if (options.template) {
      const templatePath = options.output || '.env.example'
      generateEnvTemplate(config, templatePath)
      CliLogger.success(`📝 Generated environment variable template at ${templatePath}`)
    }
    
  } catch (error) {
    CliLogger.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

/**
 * Generate an environment variable template based on the configuration
 * @param options Command options
 */
export async function generateTemplate(options: { output?: string }) {
  try {
    // Get the config path - typically ayazmo.config.js in the project root
    const configPath = path.join(process.cwd(), 'ayazmo.config.js')
    
    // Attempt to load the configuration
    let config
    try {
      config = await importGlobalConfig(configPath)
    } catch (error) {
      CliLogger.error(`Error loading configuration from ${configPath}: ${error.message}`)
      process.exit(1)
    }
    
    const templatePath = options.output || '.env.example'
    generateEnvTemplate(config, templatePath)
    CliLogger.success(`📝 Generated environment variable template at ${templatePath}`)
    
  } catch (error) {
    CliLogger.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
} 