export class QueryFilterManager {
  private filters: Map<string, object> = new Map();

  constructor(defaultFilters: object) {
    this.setDefaultFilters(defaultFilters)
  }

  public setConfigurableFilters(filters: object) {
    Object.entries(filters).forEach(([key, filter]) => {
      this.filters.set(key, filter);
    });
  }

  public setDefaultFilters(filters: object) {
    Object.entries(filters).forEach(([key, filter]) => {
      this.setDefaultFilter(key, filter);
    });
  }

  public setDefaultFilter(name: string, filter: object) {
    if (!this.filters.has(name)) {
      this.filters.set(name, filter);
    }
  }

  public getFilter(name: string, args: any): object {
    const filter = this.filters.get(name) ?? {}
    if (typeof filter === 'function') {
      return filter(args);
    }

    return filter;
  }
}