export class QueryFilterManager {
  private readonly filters: Map<string, object> = new Map()

  constructor (defaultFilters: object) {
    this.setDefaultFilters(defaultFilters)
  }

  public setConfigurableFilters (filters: object): void {
    Object.entries(filters).forEach(([key, filter]) => {
      this.filters.set(key, filter)
    })
  }

  public setDefaultFilters (filters: object): void {
    Object.entries(filters).forEach(([key, filter]) => {
      this.setDefaultFilter(key, filter)
    })
  }

  public setDefaultFilter (name: string, filter: object): void {
    if (!this.filters.has(name)) {
      this.filters.set(name, filter)
    }
  }

  public getFilter (name: string, args: unknown): object {
    const filter = this.filters.get(name) ?? {}
    if (typeof filter === 'function') {
      return filter(args)
    }

    return filter
  }
}
