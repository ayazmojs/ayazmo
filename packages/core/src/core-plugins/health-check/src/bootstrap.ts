import { z } from 'zod'
import type { AyazmoInstance, PluginConfig } from '@ayazmo/types'

// Plugin configuration schema
export const schema = z.object({
  name: z.literal('health-check'),
  settings: z.object({
    enabled: z.boolean().optional().default(true),
    route: z.string().optional().default('/health'),
    // We can't validate the handler function with Zod easily, so we'll do that at runtime
  }).optional()
})

// Main bootstrap function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function(app: AyazmoInstance, _config: PluginConfig): Promise<{ shutdown?: () => Promise<void> }> {
  app.log.info('Initializing health-check core plugin')
  
  // The routes will be loaded automatically by the plugin manager from routes.ts
  
  // Return an object with the shutdown function
  return {
    shutdown: async () => {
      app.log.info('Shutting down health-check core plugin')
      // No specific cleanup needed for health check
    }
  }
} 