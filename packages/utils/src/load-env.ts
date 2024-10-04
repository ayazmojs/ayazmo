import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Loads the environment variables from the appropriate .env file based on the NODE_ENV.
 */
export function loadEnvironmentVariables (): void {
  // Determine the environment and construct the filename
  const environment = process.env.NODE_ENV ?? 'development'
  const envPath = path.resolve(process.cwd(), `.env.${environment}`)

  // Check if the environment-specific file exists
  if (fs.existsSync(envPath)) {
    config({ path: envPath })
  } else {
    config() // Load the default .env file
  }
}
