// src/configLoader.ts
import { AyazmoInstance } from '@ayazmo/types';
import { merge, importGlobalConfig } from '@ayazmo/utils';
import { AwilixContainer, asValue } from 'awilix';

interface UserConfig {
  default?: any;
}

export const loadConfig = async (config: string, app: AyazmoInstance, diContainer: AwilixContainer) => {
  let userConfig: UserConfig = {};

  try {
    userConfig = await importGlobalConfig(config);
    // TODO: Validate userConfig here
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error; // re-throw the error if it's not 'MODULE_NOT_FOUND'
    }
    app.log.warn('ayazmo.config.js not found, proceeding with default configurations.');
  }

  const defaultConfig = {
    // Define your default configurations here
  };

  const mergedConfig = merge(defaultConfig, (userConfig as UserConfig));

  diContainer.register({
    config: asValue(mergedConfig),
  });

  return mergedConfig
};
