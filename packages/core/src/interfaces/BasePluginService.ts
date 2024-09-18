import { PluginSettings, EntityManager, EntityRepository, AyazmoContainer, AyazmoInstance } from '@ayazmo/types'

export abstract class BasePluginService {
  public container: AyazmoContainer
  public pluginSettings: PluginSettings
  private _em: EntityManager | undefined
  app: AyazmoInstance

  constructor (app: AyazmoInstance, pluginSettings: PluginSettings) {
    if (new.target === BasePluginService) {
      throw new Error('BaseService is an abstract class and cannot be instantiated directly.')
    }
    this.container = app.diContainer as AyazmoContainer
    this.pluginSettings = pluginSettings
    this.app = app
  }

  public get em(): EntityManager {
    if (!this._em) {
      this._em = this.container.dbService.em
    }
    return this._em
  }

  public getRepository (entityName: string): EntityRepository<any> {
    return this.em.getRepository(entityName);
  }

  public getService (serviceName: string) {
    return this.container.resolve(serviceName)
  }

  public getPluginSettings (): PluginSettings {
    return this.pluginSettings
  }
}
