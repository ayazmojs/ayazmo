// src/configLoader.ts
import { AyazmoInstance } from '@ayazmo/types';
import { merge, importGlobalConfig, AppConfig } from '@ayazmo/utils';
import { AwilixContainer, asValue } from 'awilix';

export const loadConfig = async (config: string, app: AyazmoInstance, diContainer: AwilixContainer): Promise<AppConfig> => {
  const defaultConfig: any = {
    // Define your default configurations here
    database: {},
    plugins: [],
  };

  try {
    const userConfig: AppConfig = await importGlobalConfig(config);
    // TODO: Validate userConfig here

    const mergedConfig: AppConfig = merge(defaultConfig, userConfig);

    diContainer.register({
      config: asValue(mergedConfig),
    });

    return mergedConfig
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error; // re-throw the error if it's not 'MODULE_NOT_FOUND'
    }
    app.log.warn('ayazmo.config.js not found, proceeding with default configurations.');
    return defaultConfig;
  }
};
