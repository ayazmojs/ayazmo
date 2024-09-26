// src/configLoader.ts
import { AyazmoInstance, AppConfig } from '@ayazmo/types'
import { merge, importGlobalConfig } from '@ayazmo/utils'
import { asValue } from 'awilix'

export const loadConfig = async (app: AyazmoInstance): Promise<AppConfig> => {
  const defaultConfig: any = {
    // Define your default configurations here
    admin: {
      enabled: true,
      opts: {
        prefix: '/admin'
      }
    },
    plugins: []
  }

  try {
    const userConfig: AppConfig = await importGlobalConfig(app.configPath)
    // TODO: Validate userConfig here

    const mergedConfig: AppConfig = merge(defaultConfig, userConfig)

    app.diContainer.register({
      config: asValue(mergedConfig)
    })

    return mergedConfig
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error // re-throw the error if it's not 'MODULE_NOT_FOUND'
    }
    app.log.warn('ayazmo.config.js not found, proceeding with default configurations.')
    return defaultConfig
  }
}
