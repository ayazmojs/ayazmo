interface PluginConfig {
  name: string;
  settings: any;
}

export interface AppConfig {
  plugins: PluginConfig[];
  database: Record<string, any>;
}
