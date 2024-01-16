import { AwilixContainer } from 'awilix';
import { PluginConfig } from '@ayazmo/types';
import { EntityManager } from '@mikro-orm/core';
import { AyazmoCoreService } from './AyazmoCoreService.js';

export abstract class BaseService extends AyazmoCoreService {
  em: EntityManager;

  constructor(container: AwilixContainer, pluginConfig: PluginConfig) {
    super(container, pluginConfig);
    if (new.target === BaseService) {
      throw new Error("BaseService is an abstract class and cannot be instantiated directly.");
    }
    this.container = container;
    this.pluginConfig = pluginConfig;
    // @ts-ignore
    this.em = container.dbService.em;
  }

  getEntity(entityName: string) {
    return this.em.getRepository(entityName);
  }

  getService(serviceName: string) {
    return this.container.resolve(serviceName);
  }
}
