import { AwilixContainer } from 'awilix';

export abstract class BaseService {
  protected diScope: AwilixContainer;
  protected config: Record<string, any>;

  constructor(container: AwilixContainer, config: Record<string, any>) {
    this.diScope = container;
    this.config = config;
  }
}

interface PluginConfig {
  name: string;
  settings: any;
}

export interface AppConfig {
  plugins: PluginConfig[];
  database: Record<string, any>;
}
