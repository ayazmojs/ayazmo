import { AyazmoInstance } from '@ayazmo/types'

/**
 * Interface for core plugins in the Ayazmo framework
 */
export interface CorePlugin {
  /**
   * The name of the plugin
   */
  readonly name: string;
  
  /**
   * Initialize the plugin
   * 
   * @param app The Ayazmo application instance
   * @param config The plugin configuration
   */
  initialize(app: AyazmoInstance, config: any): Promise<void>;
  
  /**
   * Shutdown the plugin (optional)
   * 
   * @param app The Ayazmo application instance
   */
  shutdown?(app: AyazmoInstance): Promise<void>;
} 