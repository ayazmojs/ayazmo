/**
 * Configuration module for Ayazmo framework
 * 
 * This module provides tools for managing application configuration.
 * 
 * Key features:
 * - Configuration loading from multiple sources
 * - Environment variable overrides
 * - .env file support
 * - Type conversion
 * - Dot notation access to nested properties
 * - Configuration validation tools
 */

export { ConfigService } from './ConfigService.js'

/**
 * Configuration environment variables
 * 
 * The Ayazmo framework supports configuration through environment variables.
 * All environment variables must be prefixed with `AYAZMO_` to be recognized.
 * 
 * Format:
 * - All variables must be prefixed with `AYAZMO_`
 * - Use either dot notation or underscores to represent nested properties:
 *   AYAZMO_APP.SERVER.PORT=3000 or AYAZMO_APP_SERVER_PORT=3000
 * - For arrays, use numeric indices: AYAZMO_PLUGINS_0_NAME="plugin-name"
 * 
 * Examples:
 * - AYAZMO_APP_SERVER_PORT=3000 => config.app.server.port = 3000
 * - AYAZMO_ADMIN_ENABLED=false => config.admin.enabled = false
 * - AYAZMO_PLUGINS_0_NAME="my-plugin" => config.plugins[0].name = "my-plugin"
 */ 