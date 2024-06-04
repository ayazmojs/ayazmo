import { AppConfig, AyazmoContainer, AyazmoInstance } from '@ayazmo/types'

export abstract class AyazmoCoreService {
  container: AyazmoContainer
  pluginConfig: AppConfig
  app: AyazmoInstance

  constructor (container: AyazmoContainer, pluginConfig: AppConfig, app: AyazmoInstance) {
    if (new.target === AyazmoCoreService) {
      throw new Error('AyazmoCoreService is an abstract class and cannot be instantiated directly.')
    }
    this.container = container
    this.pluginConfig = pluginConfig
    this.app = app
  }

  getGlobalConfig (): AppConfig {
    return this.container.config
  }
}
