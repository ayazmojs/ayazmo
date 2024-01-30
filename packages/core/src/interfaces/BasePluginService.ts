import { AwilixContainer } from 'awilix';
import { PluginConfig, EntityManager, EntityRepository } from '@ayazmo/types';

export abstract class BasePluginService {
  public em: EntityManager;
  public container: AwilixContainer;
  public pluginConfig: PluginConfig;

  constructor(container: AwilixContainer, pluginConfig: PluginConfig) {
    if (new.target === BasePluginService) {
      throw new Error("BaseService is an abstract class and cannot be instantiated directly.");
    }
    this.container = container;
    this.pluginConfig = pluginConfig;
    // @ts-ignore
    this.em = container.dbService.em;
  }

  public getRepository(entityName: string): EntityRepository<any> {
    return this.em.getRepository(entityName);
  }

  public getService(serviceName: string) {
    return this.container.resolve(serviceName);
  }

  public getPluginConfig(): PluginConfig {
    return this.pluginConfig
  }
}
