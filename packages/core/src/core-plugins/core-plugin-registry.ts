/**
 * Core plugin metadata interface
 */
export interface CorePluginMetadata {
  /**
   * The name of the plugin
   */
  name: string;
  
  /**
   * Description of the plugin's functionality
   */
  description: string;
  
  /**
   * Default configuration for the plugin
   */
  defaultConfig?: Record<string, any>;
}

/**
 * Registry of available core plugins
 */
export const CORE_PLUGINS: Record<string, CorePluginMetadata> = {
  // Register the health-check core plugin
  'health-check': {
    name: 'health-check',
    description: 'Provides a health check endpoint for monitoring application status',
    defaultConfig: {
      route: '/health'
    }
  },
  
  // Register the websocket core plugin
  'websocket': {
    name: 'websocket',
    description: 'Provides WebSocket support for real-time communication',
    defaultConfig: {
      enabled: true,
      options: {},  // Default empty options for @fastify/websocket
      enableExampleRoutes: false  // Example routes disabled by default
    }
  }
};

/**
 * Register a core plugin in the registry
 * 
 * @param metadata The plugin metadata
 */
export function registerCorePlugin(metadata: CorePluginMetadata): void {
  CORE_PLUGINS[metadata.name] = metadata;
}

/**
 * Get metadata for a specific core plugin
 * 
 * @param name The name of the plugin
 * @returns The plugin metadata or undefined if not found
 */
export function getCorePluginMetadata(name: string): CorePluginMetadata | undefined {
  return CORE_PLUGINS[name];
}

/**
 * Check if a plugin is registered as a core plugin
 * 
 * @param name The name of the plugin
 * @returns True if the plugin is registered, false otherwise
 */
export function isCorePlugin(name: string): boolean {
  return name in CORE_PLUGINS;
} 