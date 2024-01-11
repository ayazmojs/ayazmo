import { AwilixContainer } from 'awilix';
import { PluginConfig } from '@ayazmo/types';
import { EntityManager } from '@mikro-orm/core';

export class BaseService {
  container: AwilixContainer; // Add property declaration for 'container'
  pluginConfig: PluginConfig; // Add property declaration for 'pluginOptions'
  em: EntityManager;

  constructor(container: AwilixContainer, pluginConfig: PluginConfig) {
    if (new.target === BaseService) {
      throw new Error("BaseService is an abstract class and cannot be instantiated directly.");
    }
    this.container = container;
    this.pluginConfig = pluginConfig;
    // @ts-ignore
    this.em = container.dbService.em;
  }

  getEntity(entityName: string) {
    console.log(this.container)
    return this.em.getRepository(entityName);
  }

  getService(serviceName: string) {
    return this.container.resolve(serviceName);
  }
}
