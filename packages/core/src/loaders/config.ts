// src/configLoader.ts
// import { resolve } from 'path';
import { AyazmoInstance } from '@ayazmo/types';
import { merge } from '@ayazmo/utils';
import { AwilixContainer, asValue } from 'awilix';

export const loadConfig = async (config: string, app: AyazmoInstance, diContainer: AwilixContainer) => {
  // const configPath = resolve(config);
  let userConfig: UserConfig = {};

  try {
    userConfig = await import(config);
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

  interface UserConfig {
    default?: any;
  }

  const mergedConfig = merge(defaultConfig, (userConfig as UserConfig).default);

  diContainer.register({
    config: asValue(mergedConfig),
  });

  return mergedConfig
};
