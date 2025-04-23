import { AppConfig, PluginConfig } from '@ayazmo/types'
import { AyazmoInstance } from '@ayazmo/types'
import { asValue } from 'awilix'
import path from 'node:path'
import fs from 'node:fs'
import { dotGet, dotSet, validateSchema, validateEnvVars, getRegisteredPlugins } from '@ayazmo/utils'
import { merge } from 'lodash-es'

/**
 * Configuration service for managing application configuration
 */
export class ConfigService {
  private config: AppConfig;
  private static instance: ConfigService;
  private readonly app: AyazmoInstance

  private constructor(app: AyazmoInstance) {
    this.app = app
    this.config = {} as AppConfig
  }

  /**
   * Get the singleton instance of ConfigService
   * 
   * @param app AyazmoInstance for service registration
   */
  static getInstance(app: AyazmoInstance): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService(app)
    }
    return ConfigService.instance
  }

  /**
   * Load configuration from a file
   * 
   * @param configPath Path to the configuration file
   */
  loadFromFile(configPath: string): this {
    try {
      const resolvedPath = path.resolve(process.cwd(), configPath)
      const configData = fs.readFileSync(resolvedPath, 'utf8')
      const fileConfig = JSON.parse(configData)
      this.config = { ...this.config, ...fileConfig }
      
      // Register the config service with the DI container
      this.app.diContainer.register({
        config: asValue(this.config),
        configService: asValue(this)
      })
      
      return this
    } catch (error) {
      console.error(`Error loading configuration from ${configPath}:`, error)
      throw error
    }
  }

  /**
   * Apply environment variable overrides to configuration
   * Environment variables should be prefixed with AYAZMO_
   * Use dots or underscores as separators:
   * - AYAZMO_APP_SERVER_PORT=3000
   * - AYAZMO_APP.SERVER.PORT=3000
   * 
   * @returns ConfigService instance for chaining
   */
  applyEnvOverrides(): this {
    const envVarPrefix = 'AYAZMO_'
    
    // Get all environment variables that match the prefix
    const envVars = Object.keys(process.env)
      .filter(key => key.startsWith(envVarPrefix))
    
    for (const envKey of envVars) {
      const envValue = process.env[envKey]
      if (envValue === undefined) continue
      
      // Remove prefix
      let configPath = envKey.substring(envVarPrefix.length)
      
      // Handle direct dot notation (AYAZMO_APP.SERVER.PORT)
      // or convert underscore to dot (AYAZMO_APP_SERVER_PORT)
      if (configPath.includes('.')) {
        // Already in dot notation, just lowercase it
        configPath = configPath.toLowerCase()
      } else {
        // Convert underscore to dot notation and lowercase
        configPath = configPath.toLowerCase().replace(/_/g, '.')
      }
      
      // Convert values to appropriate types
      let typedValue: any = envValue
      
      // Convert boolean strings
      if (envValue.toLowerCase() === 'true') {
        typedValue = true
      } else if (envValue.toLowerCase() === 'false') {
        typedValue = false
      }
      // Convert numeric strings to numbers
      else if (!isNaN(Number(envValue)) && envValue.trim() !== '') {
        typedValue = Number(envValue)
      }
      // All other values remain as strings
      
      // Set the value in the configuration
      this.set(configPath, typedValue)
    }
    
    return this
  }

  /**
   * Load configuration from .env file
   * 
   * @param envPath Path to .env file, defaults to '.env'
   * @returns ConfigService instance for chaining
   */
  loadEnvFile(envPath = '.env'): this {
    try {
      const resolvedPath = path.resolve(process.cwd(), envPath)
      
      if (fs.existsSync(resolvedPath)) {
        const envData = fs.readFileSync(resolvedPath, 'utf8')
        
        // Parse .env file content
        const envLines = envData.split('\n')
        for (const line of envLines) {
          const trimmedLine = line.trim()
          
          // Skip comments and empty lines
          if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue
          }
          
          // Parse key-value pairs
          const match = trimmedLine.match(/^([^=]+)=(.*)$/)
          if (match) {
            const [, key, value] = match
            
            // Set in process.env if it starts with AYAZMO_
            if (key.startsWith('AYAZMO_')) {
              process.env[key] = value
            }
          }
        }
        
        // Apply environment variables to configuration
        this.applyEnvOverrides()
      }
      
      return this
    } catch (error) {
      console.warn(`Warning: Failed to load .env file from ${envPath}:`, error)
      return this
    }
  }

  /**
   * Get the entire configuration or a specific section
   * 
   * @param section Optional configuration section to retrieve
   * @returns The requested configuration
   */
  getConfig<T = AppConfig>(section?: string): T {
    if (section) {
      return this.get(section) as T
    }
    return this.config as unknown as T
  }

  /**
   * Check if a plugin is configured and enabled
   * 
   * @param pluginName Name of the plugin to check
   * @returns Boolean indicating if the plugin is enabled
   */
  isPluginEnabled(pluginName: string): boolean {
    const plugins = this.config.plugins || []
    const plugin = plugins.find(p => p.name === pluginName)
    // If the plugin exists and isn't explicitly disabled, consider it enabled
    return plugin ? plugin.settings?.enabled !== false : false
  }

  /**
   * Get plugin configuration if the plugin is enabled
   * 
   * @param pluginName Name of the plugin
   * @returns Plugin configuration or null if not enabled/found
   */
  getPluginConfig(pluginName: string): PluginConfig | null {
    if (this.isPluginEnabled(pluginName)) {
      const plugins = this.config.plugins || []
      return plugins.find(p => p.name === pluginName) || null
    }
    return null
  }

  /**
   * Get all plugins from the configuration
   * 
   * @returns Array of all plugin configurations
   */
  getPlugins(): PluginConfig[] {
    const plugins = this.get('plugins', []);
    return getRegisteredPlugins(plugins);
  }

  /**
   * Get only enabled plugins from the configuration
   * 
   * @returns Array of enabled plugin configurations
   */
  getEnabledPlugins(): PluginConfig[] {
    const plugins = this.getPlugins();
    return plugins.filter(plugin => this.isPluginEnabled(plugin.name));
  }

  /**
   * Get only disabled plugins from the configuration
   * 
   * @returns Array of disabled plugin configurations
   */
  getDisabledPlugins(): PluginConfig[] {
    const plugins = this.getPlugins();
    return plugins.filter(plugin => !this.isPluginEnabled(plugin.name));
  }

  /**
   * Validate the current configuration
   * 
   * @returns Validation result with errors if any
   */
  validate() {
    return validateSchema(this.config)
  }

  /**
   * Initializes configuration with validation
   * Throws an error if validation fails and throwOnError is true
   * 
   * @param throwOnError Whether to throw an error if validation fails
   * @returns Validation result
   */
  initWithValidation(throwOnError = true) {
    const validation = this.validate()
    
    if (!validation.valid && throwOnError) {
      throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`)
    }
    
    return validation
  }

  /**
   * Get a configuration value using dot notation
   * 
   * @param path The path in dot notation (e.g., 'app.server.port')
   * @param defaultValue Default value if the path doesn't exist
   * @returns The value at the specified path or the default value
   */
  get(path: string, defaultValue?: any): any {
    return dotGet(this.config, path, defaultValue)
  }

  /**
   * Set a configuration value using dot notation
   * 
   * @param path The path in dot notation (e.g., 'app.server.port')
   * @param value The value to set
   * @returns The ConfigService instance for chaining
   */
  set(path: string, value: any): this {
    dotSet(this.config, path, value)
    
    // Update the DI container when configuration changes
    if (this.app?.diContainer) {
      this.app.diContainer.register({
        config: asValue(this.config)
      })
    }
    
    return this
  }

  /**
   * Validate environment variables against the configuration
   * 
   * @returns Validation results for environment variables
   */
  validateEnv() {
    return validateEnvVars(this.config)
  }

  /**
   * Load and validate the configuration
   * @param userConfig Configuration from the user config file
   * @param defaultConfig Default configuration
   * @returns The merged and processed configuration
   */
  async load(userConfig: AppConfig, defaultConfig: Partial<AppConfig>): Promise<AppConfig> {
    // Load environment variables from .env file
    this.loadEnvFile()
    
    // Deep merge default config first, then user config (so user config overrides defaults)
    // Use lodash merge for proper deep merging
    const mergedConfig = merge({}, defaultConfig, userConfig)
    
    // Store the initial config
    this.config = mergedConfig
    
    // Apply environment variable overrides
    this.applyEnvOverrides()
    
    // Register in the DI container
    this.app.diContainer.register({
      config: asValue(this.config),
      configService: asValue(this)
    })
    
    // Validate the configuration
    this.validate()
    
    return this.config
  }
} 