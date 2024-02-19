import { AwilixContainer } from 'awilix'
import { AppConfig } from '@ayazmo/types'

export abstract class AyazmoCoreService {
  container: AwilixContainer
  pluginConfig: AppConfig

  constructor (container: AwilixContainer, pluginConfig: AppConfig) {
    if (new.target === AyazmoCoreService) {
      throw new Error('AyazmoCoreService is an abstract class and cannot be instantiated directly.')
    }
    this.container = container
    this.pluginConfig = pluginConfig
  }

  getGlobalConfig (): AppConfig {
    // @ts-expect-error
    return this.container.config
  }
}
