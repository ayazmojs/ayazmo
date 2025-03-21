// src/configLoader.ts
import { AyazmoInstance, AppConfig } from '@ayazmo/types'
import { importGlobalConfig } from '@ayazmo/utils'
import { ConfigService } from '../config/index.js'

export const loadConfig = async (app: AyazmoInstance): Promise<AppConfig> => {
  const defaultConfig: Partial<AppConfig> = {
    admin: {
      enabled: true,
      opts: {
        prefix: '/admin'
      },
      enabledAuthProviders: [],
      roles: {},
      routes: {}
    },
    plugins: [],
    app: {
      server: {},
      emitter: {
        type: 'memory',
        queues: [],
        workers: []
      },
      redis: null,
      cors: {},
      cache: {
        enabled: false,
        storage: {
          type: 'memory',
          options: {}
        },
        ttl: 60,
        stale: 10
      },
      enabledAuthProviders: []
    }
  }

  try {
    const userConfig: AppConfig = await importGlobalConfig(app.configPath)
    // Use ConfigService to load and merge configurations
    const configService = ConfigService.getInstance(app)
    return await configService.load(userConfig, defaultConfig)
    
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error // re-throw the error if it's not 'MODULE_NOT_FOUND'
    }
    app.log.warn('ayazmo.config.js not found, proceeding with default configurations.')
    
    // Use ConfigService with just default config
    const configService = ConfigService.getInstance(app)
    return await configService.load({} as AppConfig, defaultConfig)
  }
}
