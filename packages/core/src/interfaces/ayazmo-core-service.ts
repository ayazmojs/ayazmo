import { AwilixContainer } from 'awilix';
import { PluginConfig } from '@ayazmo/types';

export abstract class AyazmoCoreService {
  container: AwilixContainer; // Add property declaration for 'container'
  pluginConfig: PluginConfig; // Add property declaration for 'pluginOptions'

  constructor(container: AwilixContainer, pluginConfig: PluginConfig) {
    if (new.target === AyazmoCoreService) {
      throw new Error("AyazmoCoreService is an abstract class and cannot be instantiated directly.");
    }
    this.container = container;
    this.pluginConfig = pluginConfig;
  }

  getGlobalConfig() {
    // @ts-ignore
    return this.container.config;
  }
}
