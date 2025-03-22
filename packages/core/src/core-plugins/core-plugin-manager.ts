import { AyazmoInstance } from '@ayazmo/types'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { CORE_PLUGINS } from './core-plugin-registry.js'

// Get the directory path for the current ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Core Plugin Manager
 * Handles loading and managing core plugins
 */
export class CorePluginManager {
  private readonly app: AyazmoInstance;
  private loadedPlugins: Map<string, any> = new Map();
  private pluginOverrides: Map<string, string> = new Map();

  /**
   * Creates a new CorePluginManager
   * 
   * @param app The Ayazmo application instance
   */
  constructor(app: AyazmoInstance) {
    this.app = app;
  }

  /**
   * Get configuration for enabled core plugins
   * 
   * @returns An array of enabled core plugins with their configurations
   */
  public getEnabledCorePlugins(): Array<{ name: string, config: any }> {
    const configService = this.app.diContainer.resolve('configService');
    // Get configuration from corePlugins section
    const corePluginsConfig = configService.get('corePlugins', {});
    const enabled: Array<{ name: string, config: any }> = [];

    // Process core plugins from the configuration
    for (const [name, config] of Object.entries(corePluginsConfig)) {
      if (config === false) continue; // Explicitly disabled
      
      enabled.push({
        name,
        // If config is true, use empty object, otherwise use the config object
        config: config === true ? {} : config
      });
    }
    
    // Enable plugins by default based on registry information
    // This replaces the hardcoded approach with a more dynamic one
    for (const [pluginName, metadata] of Object.entries(CORE_PLUGINS)) {
      // Skip if already configured
      if (enabled.some(plugin => plugin.name === pluginName)) {
        continue;
      }
      
      // Skip if explicitly disabled in config
      if (corePluginsConfig[pluginName] === false) {
        continue;
      }
      
      // Add plugin with default config from registry
      enabled.push({
        name: pluginName,
        config: metadata.defaultConfig || {}
      });
    }

    return enabled;
  }

  /**
   * Load and initialize enabled core plugins
   * 
   * @returns Promise that resolves when all core plugins are loaded
   */
  public async loadCorePlugins(): Promise<void> {
    const enabledPlugins = this.getEnabledCorePlugins();
    // Find any plugins that override core plugins
    this.discoverOverrides();
    
    this.app.log.info(`Loading ${enabledPlugins.length} core plugins`);

    // Load all enabled plugins
    for (const plugin of enabledPlugins) {
      await this.loadCorePlugin(plugin.name, plugin.config);
    }
  }

  /**
   * Discover plugins that override core plugins
   * Currently only checks for convention-based naming pattern: ayazmo-core-[plugin-name]
   */
  private discoverOverrides(): void {
    const configService = this.app.diContainer.resolve('configService');
    const plugins = configService.getPlugins();
    
    // Find plugins that match the override naming convention
    for (const plugin of plugins) {
      // If the plugin name starts with 'ayazmo-core-'
      if (plugin.name.startsWith('ayazmo-core-')) {
        const coreName = plugin.name.substring('ayazmo-core-'.length);
        
        // Check if this corresponds to a core plugin
        if (coreName in CORE_PLUGINS) {
          this.pluginOverrides.set(coreName, plugin.name);
          this.app.log.info(`Plugin '${plugin.name}' will override core plugin '${coreName}'`);
        }
      }
    }
  }

  /**
   * Get core plugin paths in a consistent way
   * 
   * @param pluginName The name of the core plugin
   * @returns Object with paths to plugin components
   */
  private getCorePluginPaths(pluginName: string) {
    // First try looking in the dist directory (for compiled code)
    const currentPath = __dirname;
    const isDevelopment = currentPath.includes('/src/');
    
    let distPluginDir;
    if (isDevelopment) {
      // In development, transform from src to dist path
      const distBasePath = currentPath.replace('/src/', '/dist/');
      distPluginDir = path.join(distBasePath, pluginName);
    } else {
      // In production (already in dist), just use the current directory
      distPluginDir = path.join(currentPath, pluginName);
    }
    
    // Check for compiled JS files
    const distBootstrapPath = path.join(distPluginDir, 'src', 'bootstrap.js');
    const distRoutesPath = path.join(distPluginDir, 'src', 'routes.js');
    
    const distBootstrapExists = fs.existsSync(distBootstrapPath);
    const distRoutesExists = fs.existsSync(distRoutesPath);
    
    this.app.log.debug(`Looking for core plugin ${pluginName}: bootstrap=${distBootstrapExists ? 'found' : 'not found'}, routes=${distRoutesExists ? 'found' : 'not found'}`);
    
    // If bootstrap found in dist, use it
    if (distBootstrapExists) {
      return {
        bootstrap: distBootstrapPath,
        routes: distRoutesExists ? distRoutesPath : null
      };
    }
    
    // If we get here, we couldn't find the files in the dist directory
    // Log a warning
    this.app.log.warn(`Could not find bootstrap file for core plugin ${pluginName}`);
    
    return {
      bootstrap: null,
      routes: null
    };
  }

  /**
   * Load a specific core plugin
   * 
   * @param pluginName Name of the plugin to load
   * @param config Configuration for the plugin
   */
  private async loadCorePlugin(pluginName: string, config: any): Promise<void> {
    try {
      // Check if this core plugin has an override
      const overridePluginName = this.pluginOverrides.get(pluginName);
      
      if (overridePluginName) {
        // Load the override plugin instead
        await this.loadOverridePlugin(pluginName, overridePluginName, config);
        return;
      }
      
      // Get the paths for this core plugin
      const pluginPaths = this.getCorePluginPaths(pluginName);
      
      // Check if bootstrap file exists
      if (!pluginPaths.bootstrap) {
        throw new Error(`Bootstrap file not found for core plugin ${pluginName}`);
      }
      
      // Load the plugin module
      const pluginModule = await import(pluginPaths.bootstrap);
      
      if (!pluginModule.default) {
        throw new Error(`Core plugin ${pluginName} does not export a default export`);
      }
      
      // Create the plugin config with settings
      const pluginConfig = {
        name: pluginName,
        settings: config
      };
      
      // Validate config if the plugin has a schema
      if (pluginModule.schema) {
        const result = pluginModule.schema.safeParse(pluginConfig);
        if (!result.success) {
          const errors = result.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join('\n');
          
          throw new Error(`Invalid configuration for core plugin '${pluginName}':\n${errors}`);
        }
      }
      
      // Invoke the bootstrap function with app and config
      const pluginExports = await pluginModule.default(this.app, pluginConfig);
      
      // Store the plugin exports (including shutdown function)
      this.loadedPlugins.set(pluginName, pluginExports);
      
      // Load the plugin's routes if available
      await this.loadPluginComponents(pluginName, pluginPaths, config);
      
      this.app.log.info(`Core plugin ${pluginName} loaded successfully`);
    } catch (error) {
      this.app.log.error(`Failed to load core plugin ${pluginName}: ${error.message}`);
      throw error; // Rethrow for now - critical failures in core plugins should stop the app
    }
  }
  
  /**
   * Load a plugin's components (routes, services, etc.)
   * 
   * @param pluginName The name of the plugin
   * @param pluginPaths Paths to plugin components
   * @param config Plugin configuration
   */
  private async loadPluginComponents(pluginName: string, pluginPaths: { bootstrap: string | null, routes: string | null }, config: any): Promise<void> {
    // Load routes if they exist
    if (pluginPaths.routes) {
      try {
        const routes = await import(pluginPaths.routes);
        if (routes.default && typeof routes.default === 'function') {
          // Pass the plugin configuration to the routes function
          await routes.default(this.app, config);
          this.app.log.debug(`Routes registered for core plugin ${pluginName}`);
        }
      } catch (error) {
        this.app.log.error(`Error loading routes for core plugin ${pluginName}: ${error.message}`);
      }
    }
    
    // Other components can be loaded here as needed (services, entities, etc.)
  }

  /**
   * Load a third-party plugin that overrides a core plugin
   * 
   * @param corePluginName The name of the core plugin being overridden
   * @param overridePluginName The name of the override plugin
   * @param config The configuration for the plugin
   */
  private async loadOverridePlugin(corePluginName: string, overridePluginName: string, config: any): Promise<void> {
    try {
      const configService = this.app.diContainer.resolve('configService');
      const overridePlugin = configService.getPluginConfig(overridePluginName);
      
      if (!overridePlugin) {
        throw new Error(`Override plugin '${overridePluginName}' not found in configuration`);
      }
      
      // We'll need to adapt this to use your existing plugin loading mechanism
      // For now this is a placeholder
      this.app.log.info(`Core plugin ${corePluginName} was overridden by ${overridePluginName}`);
      
      // In a real implementation, we would load the override plugin here
      // and store it in the loadedPlugins map with the core plugin name
    } catch (error) {
      this.app.log.error(`Failed to load override plugin for ${corePluginName}: ${error.message}`);
      
      // Try to load the core plugin as a fallback
      this.app.log.info(`Falling back to core plugin ${corePluginName}`);
      
      // Remove the override to prevent infinite recursion
      this.pluginOverrides.delete(corePluginName);
      
      // Try to load the core plugin
      await this.loadCorePlugin(corePluginName, config);
    }
  }

  /**
   * Shut down all loaded plugins
   */
  public async shutdownPlugins(): Promise<void> {
    for (const [name, plugin] of this.loadedPlugins.entries()) {
      if (typeof plugin.shutdown === 'function') {
        try {
          await plugin.shutdown(this.app);
          this.app.log.info(`Core plugin ${name} shutdown successfully`);
        } catch (error) {
          this.app.log.error(`Error shutting down core plugin ${name}: ${error.message}`);
        }
      }
    }
  }
} 