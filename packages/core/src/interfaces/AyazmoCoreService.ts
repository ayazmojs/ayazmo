import { AppConfig, AyazmoContainer } from '@ayazmo/types'

export abstract class AyazmoCoreService {
  container: AyazmoContainer
  pluginConfig: AppConfig

  constructor (container: AyazmoContainer, pluginConfig: AppConfig) {
    if (new.target === AyazmoCoreService) {
      throw new Error('AyazmoCoreService is an abstract class and cannot be instantiated directly.')
    }
    this.container = container
    this.pluginConfig = pluginConfig
  }

  getGlobalConfig (): AppConfig {
    return this.container.config
  }
}
