import { PluginSettings, EntityManager, EntityRepository, AyazmoContainer, AyazmoInstance } from '@ayazmo/types'
import { QueryFilterManager } from '@ayazmo/utils'

export abstract class BasePluginService {
  public container: AyazmoContainer
  public pluginSettings: PluginSettings
  private _em: EntityManager | undefined
  app: AyazmoInstance
  private _queryFilterManager: QueryFilterManager
  protected abstract defaultQueryFilters: Record<string, any>;

  constructor(app: AyazmoInstance, pluginSettings: PluginSettings) {
    if (new.target === BasePluginService) {
      throw new Error('BaseService is an abstract class and cannot be instantiated directly.')
    }
    this.container = app.diContainer as AyazmoContainer
    this.pluginSettings = pluginSettings
    this.app = app
  }

  protected initQueryFilterManager(): void {
    this._queryFilterManager = new QueryFilterManager(this.defaultQueryFilters || {})
    if (this.pluginSettings.queryFilters) {
      this._queryFilterManager.setConfigurableFilters(this.pluginSettings.queryFilters)
    }
  }

  public getQueryFilter(name: string, args: any): any {
    if (!this._queryFilterManager) {
      this.initQueryFilterManager()
    }
    return this._queryFilterManager.getFilter(name, args)
  }

  public get em(): EntityManager {
    if (!this._em) {
      this._em = this.container.resolve('dbService').em
    }
    return this._em!
  }

  public getRepository(entityName: string): EntityRepository<any> {
    return this.em.getRepository(entityName);
  }

  public getService(serviceName: string) {
    if (!this.container.hasRegistration(serviceName)) {
      this.app.log.error(`Service ${serviceName} is not registered in the container.`)
      this.app.log.debug("Registered services:")
      this.app.log.debug(this.container.registrations)
    }
    return this.container.resolve(serviceName)
  }

  public getPluginSettings(): PluginSettings {
    return this.pluginSettings
  }
}
