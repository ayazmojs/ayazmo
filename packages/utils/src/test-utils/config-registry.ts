import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync, rmSync } from 'node:fs'

// Root directory for temporary test configurations - make it customizable
const DEFAULT_TEMP_CONFIG_ROOT = 'temp-configs'

// Track registered configs for cleanup
const registeredConfigs = new Set<string>()

/**
 * Options for createTestConfig function
 */
export interface CreateTestConfigOptions {
  /**
   * Base directory for temporary configurations (relative to process.cwd())
   */
  baseDir?: string;
}

/**
 * Create a temporary test configuration file
 * 
 * @param testName - Identifier for the test
 * @param configContent - Configuration object to write
 * @param options - Options for test config creation
 * @returns Path to the configuration file
 */
export async function createTestConfig(
  testName: string, 
  configContent: Record<string, any>,
  options: CreateTestConfigOptions = {}
): Promise<string> {
  // Create a unique directory name with timestamp
  const timestamp = Date.now()
  const uniqueId = Math.random().toString(36).substring(2, 10)
  
  // Allow custom base directory with fallback to default
  const tempRoot = options.baseDir 
    ? path.join(process.cwd(), options.baseDir)
    : path.join(process.cwd(), DEFAULT_TEMP_CONFIG_ROOT)
  
  const configDir = path.join(tempRoot, `${testName}-${timestamp}-${uniqueId}`)
  const configPath = path.join(configDir, 'ayazmo.config.js')
  
  // Ensure the base temp directory exists
  await fs.mkdir(tempRoot, { recursive: true })
  
  // Create the test-specific directory
  await fs.mkdir(configDir, { recursive: true })
  
  // Create an ES module compatible config file
  // Use export default instead of module.exports
  await fs.writeFile(
    configPath, 
    `export default ${JSON.stringify(configContent, null, 2)}`
  )
  
  // Register this config for later cleanup
  registeredConfigs.add(configPath)
  
  return configPath
}

/**
 * Clean up a specific test configuration
 * 
 * @param configPath - Path to the configuration file
 */
export async function cleanupTestConfig(configPath: string | undefined): Promise<void> {
  if (!configPath) return
  
  try {
    const configDir = path.dirname(configPath)
    await fs.rm(configDir, { recursive: true, force: true })
    registeredConfigs.delete(configPath)
  } catch (err) {
    console.error(`Failed to clean up test config at ${configPath}:`, err)
  }
}

/**
 * Clean up all registered test configurations
 */
export async function cleanupAllTestConfigs(): Promise<void> {
  const promises: Promise<void>[] = []
  
  for (const configPath of registeredConfigs) {
    promises.push(cleanupTestConfig(configPath))
  }
  
  await Promise.allSettled(promises)
  registeredConfigs.clear()
}

// Safety net cleanup on process exit
process.on('exit', () => {
  for (const configPath of registeredConfigs) {
    try {
      const configDir = path.dirname(configPath)
      if (existsSync(configDir)) {
        rmSync(configDir, { recursive: true, force: true })
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Can't do much in exit handlers
    }
  }
}) 