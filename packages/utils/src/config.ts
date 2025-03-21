/**
 * Configuration utilities for Ayazmo
 * 
 * This module provides utilities for working with configuration objects:
 * - Schema validation using Zod
 * - Dot notation access for nested objects
 */

import { z } from 'zod'
import { AppConfig } from '@ayazmo/types'
import fs from 'node:fs'

/**
 * Type for any nested object structure
 */
export type NestedObject = Record<string, any>

/**
 * Gets a value from a nested object using dot notation
 * 
 * @param obj The object to get a value from
 * @param path The path in dot notation (e.g., 'app.server.port')
 * @param defaultValue Optional default value if the path doesn't exist
 * @returns The value at the path or defaultValue if not found
 */
export function dotGet(obj: NestedObject, path: string, defaultValue?: any): any {
  if (!path) return obj
  
  const parts = path.split('.')
  let current = obj
  
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) {
      return defaultValue
    }
    
    current = current[parts[i]]
  }
  
  return current !== undefined ? current : defaultValue
}

/**
 * Sets a value in a nested object using dot notation
 * Creates the path if it doesn't exist
 * 
 * @param obj The object to set a value in
 * @param path The path in dot notation (e.g., 'app.server.port')
 * @param value The value to set
 * @returns The modified object
 */
export function dotSet(obj: NestedObject, path: string, value: any): NestedObject {
  if (!path) {
    return obj
  }
  
  const parts = path.split('.')
  let current = obj
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    
    if (!(part in current)) {
      current[part] = {}
    }
    
    current = current[part]
  }
  
  const lastPart = parts[parts.length - 1]
  current[lastPart] = value
  
  return obj
}

/**
 * Checks if a property exists in a nested object using dot notation
 * 
 * @param obj The object to check
 * @param path The path in dot notation (e.g., 'app.server.port')
 * @returns True if the property exists, false otherwise
 */
export function dotExists(obj: NestedObject, path: string): boolean {
  if (!path) return true
  
  const parts = path.split('.')
  let current = obj
  
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined || !(parts[i] in current)) {
      return false
    }
    
    current = current[parts[i]]
  }
  
  return true
}

/**
 * Plugin schema for validating plugin configuration
 */
export const pluginSchema = z.object({
  name: z.string().min(1, 'Plugin name must not be empty'),
  enabled: z.boolean().optional().default(true),
  settings: z.record(z.any()).optional()
});

/**
 * Admin options schema
 */
export const adminOptsSchema = z.object({
  prefix: z.string().default('/admin')
}).optional();

/**
 * Server options schema
 */
export const serverSchema = z.object({
  port: z.number().int().min(0).max(65535).optional(),
  host: z.string().optional(),
  logger: z.any().optional(),
  https: z.any().optional()
}).optional();

/**
 * Cache options schema
 */
export const cacheSchema = z.object({
  enabled: z.boolean().optional(),
  storage: z.object({
    type: z.enum(['memory', 'redis']),
    options: z.record(z.any()).optional()
  }).optional(),
  ttl: z.number().int().positive().optional(),
  stale: z.number().int().positive().optional()
}).optional();

/**
 * Emitter schema
 */
export const emitterSchema = z.object({
  type: z.enum(['memory', 'redis']).optional(),
  queues: z.array(z.string()).optional(),
  workers: z.array(z.string()).optional()
}).optional();

/**
 * App configuration schema
 */
export const appSchema = z.object({
  server: serverSchema,
  emitter: emitterSchema,
  redis: z.any().nullable().optional(),
  cors: z.record(z.any()).optional(),
  cache: cacheSchema,
  enabledAuthProviders: z.array(z.string()).optional()
});

/**
 * Database schema with stricter validation
 */
export const databaseSchema = z.preprocess(
  // Preprocess to handle null/undefined/empty object cases
  (val) => val && typeof val === 'object' && Object.keys(val).length === 0 ? null : val,
  z.object({
    // Common database configuration fields
    type: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb']).optional(),
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    dbName: z.string().optional(),
    url: z.string().optional(),
    
    // Allow additional configuration options
    entities: z.any().optional(),
    migrations: z.any().optional(),
    debug: z.boolean().optional(),
    pool: z.any().optional(),
    ssl: z.any().optional(),
    options: z.any().optional(),
  }).passthrough() // This allows additional properties without specifying them
  .refine(data => {
    // Skip validation if null
    if (!data) return true;
    
    // Require at least some valid connection info
    return (
      // Either URL is provided
      data.url !== undefined || 
      // Or host with database name
      (data.host !== undefined && data.dbName !== undefined) ||
      // Or type is sqlite (which may use file path instead of host)
      (data.type === 'sqlite' && (data.dbName !== undefined || data.url !== undefined))
    );
  }, {
    message: "Database configuration must include either a URL or host and database name"
  }).nullable().optional()
);

/**
 * Complete configuration schema using Zod
 */
export const configSchema = z.object({
  admin: z.object({
    enabled: z.boolean().optional(),
    opts: adminOptsSchema,
    enabledAuthProviders: z.array(z.string()).optional(),
    roles: z.record(z.any()).optional(),
    routes: z.record(z.any()).optional()
  }).optional(),
  plugins: z.array(pluginSchema).default([]),  // Default to empty array to match AppConfig
  app: appSchema,
  database: databaseSchema
});

/**
 * Type for validation result
 */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Validates configuration against the Zod schema
 * 
 * @param config The configuration to validate
 * @returns Validation result with errors if any
 */
export function validateSchema(config: AppConfig): ValidationResult {
  try {
    // Parse the configuration with the schema
    configSchema.parse(config);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors for better readability
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      
      return { valid: false, errors };
    }
    
    // Handle other types of errors
    return { 
      valid: false, 
      errors: [`Unexpected validation error: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

/**
 * Validates schema and returns the parsed result
 * Provides both validation and type narrowing
 * 
 * @param config Configuration to validate and parse
 * @returns Parsed configuration with inferred types or null if invalid
 */
export function parseConfig(config: unknown): { 
  valid: boolean; 
  errors: string[]; 
  parsed: AppConfig | null; 
} {
  try {
    const parsed = configSchema.parse(config) as AppConfig;
    return { valid: true, errors: [], parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      
      return { valid: false, errors, parsed: null };
    }
    
    return { 
      valid: false, 
      errors: [`Unexpected validation error: ${error instanceof Error ? error.message : String(error)}`],
      parsed: null
    };
  }
}

/**
 * Validates environment variables against the expected configuration schema
 * @param config The application configuration to validate against
 * @returns An object containing the validation results
 */
export function validateEnvVars(config: AppConfig) {
  const results = {
    valid: [] as string[],
    invalid: [] as string[],
    unused: [] as string[]
  }

  // Find all AYAZMO_ prefixed environment variables
  const envVars = Object.keys(process.env).filter(key => key.startsWith('AYAZMO_'))
  
  for (const envVar of envVars) {
    try {
      // Parse the path from the environment variable name
      const configPath = envVar.substring(7).toLowerCase().replace(/\./g, '_').split('_')
      
      // Attempt to find where this would be applied in the config
      let isValid = false
      let current = config
      
      for (let i = 0; i < configPath.length - 1; i++) {
        const segment = configPath[i]
        
        // Handle array indices
        if (!isNaN(Number(segment)) && Array.isArray(current)) {
          const index = Number(segment)
          if (index < current.length) {
            current = current[index]
            isValid = true
            continue
          }
        }
        
        // Handle object properties
        if (current && typeof current === 'object' && segment in current) {
          current = current[segment]
          isValid = true
        } else {
          isValid = false
          break
        }
      }
      
      // Check if the final segment exists or could be added
      const lastSegment = configPath[configPath.length - 1]
      if (isValid && current && typeof current === 'object') {
        if (lastSegment in current) {
          results.valid.push(envVar)
        } else {
          // It's a new property that would be added
          results.valid.push(`${envVar} (would add new property)`)
        }
      } else {
        results.invalid.push(envVar)
      }
    } catch (error) {
      results.invalid.push(`${envVar} (error: ${error.message})`)
    }
  }
  
  return results
}

/**
 * Generates a template .env file based on the current configuration
 * @param config The application configuration to use as a template
 * @param outputPath The path to write the template .env file
 */
export function generateEnvTemplate(config: AppConfig, outputPath: string = '.env.example') {
  const lines: string[] = [
    '# Ayazmo Configuration Template',
    '# Generated automatically based on application schema',
    '# All environment variables must be prefixed with AYAZMO_',
    '# Use either underscores or dots to represent nested properties',
    '#',
    '# Examples:',
    '# AYAZMO_APP_SERVER_PORT=3000',
    '# AYAZMO_ADMIN_ENABLED=false',
    '# AYAZMO_PLUGINS_0_NAME="my-plugin"',
    ''
  ]
  
  // Helper function to extract paths from config
  function extractPaths(obj: any, currentPath: string[] = []): string[] {
    if (!obj || typeof obj !== 'object') return []
    
    const paths: string[] = []
    
    for (const [key, value] of Object.entries(obj)) {
      const newPath = [...currentPath, key]
      
      if (value === null || value === undefined) {
        paths.push(newPath.join('_'))
      } else if (typeof value !== 'object') {
        paths.push(newPath.join('_'))
      } else if (Array.isArray(value)) {
        // For arrays, add example with index 0
        if (value.length > 0) {
          const examplePath = [...newPath, '0']
          if (typeof value[0] === 'object' && value[0] !== null) {
            paths.push(...extractPaths(value[0], examplePath))
          } else {
            paths.push(examplePath.join('_'))
          }
        } else {
          // Empty array, just show the path
          paths.push(newPath.join('_'))
        }
      } else {
        paths.push(...extractPaths(value, newPath))
      }
    }
    
    return paths
  }
  
  // Extract all paths from the config
  const paths = extractPaths(config)
  
  // Generate example environment variables
  for (const p of paths) {
    // Create an environment variable line for each path
    lines.push(`# AYAZMO_${p.toUpperCase()}=value`)
  }
  
  // Write to file
  fs.writeFileSync(outputPath, lines.join('\n'))
} 