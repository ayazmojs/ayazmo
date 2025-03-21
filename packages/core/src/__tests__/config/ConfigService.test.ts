import { describe, it } from 'node:test'
import assert from 'node:assert'
import { ConfigService } from '../../config/ConfigService.js'
import { AyazmoInstance, AppConfig, AyazmoAdminConfig } from '@ayazmo/types'

describe('ConfigService', async () => {
  let mockApp: AyazmoInstance
  
  // Set up test environment before each test
  function setupTest() {
    // Create a mock app
    mockApp = {
      diContainer: {
        register: () => {}
      },
      log: {
        info: () => {},
        warn: () => {},
        error: () => {}
      }
    } as unknown as AyazmoInstance
    
    // Spy on the register method
    const originalRegister = mockApp.diContainer.register;
    let registerCalls: any[] = [];
    mockApp.diContainer.register = function(registration: any) {
      registerCalls.push(registration);
      return originalRegister.call(this, registration);
    };
    
    // Reset the singleton instance for testing
    // @ts-ignore - Accessing private static for testing
    ConfigService.instance = undefined;
    
    return { mockApp, registerCalls };
  }
  
  await it('should merge default and user configurations', async () => {
    const { mockApp, registerCalls } = setupTest();
    
    const defaultConfig: Partial<AppConfig> = {
      admin: {
        enabled: true,
        opts: { prefix: '/admin' },
        enabledAuthProviders: [],
        roles: {},
        routes: {}
      } as AyazmoAdminConfig
    };
    
    const userConfig: Partial<AppConfig> = {
      admin: {
        enabled: false,
        opts: { prefix: '/custom-admin' },
        enabledAuthProviders: [],
        roles: {},
        routes: {}
      } as AyazmoAdminConfig
    };
    
    const configService = ConfigService.getInstance(mockApp);
    const config = await configService.load(userConfig as AppConfig, defaultConfig);
    
    assert.strictEqual(config.admin.enabled, false, 'User config should override default config');
    assert.strictEqual(config.admin.opts.prefix, '/custom-admin', 'User config value should be used');
    assert.strictEqual(registerCalls.length, 1, 'diContainer.register should be called once');
  });
  
  await it('should register both config and configService in the DI container', async () => {
    const { mockApp, registerCalls } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    const defaultConfig: Partial<AppConfig> = {
      admin: {
        enabled: true,
        opts: { prefix: '/admin' },
        enabledAuthProviders: [],
        roles: {},
        routes: {}
      } as AyazmoAdminConfig
    };
    
    await configService.load({} as AppConfig, defaultConfig);
    
    assert.strictEqual(registerCalls.length, 1, 'diContainer.register should be called once');
    assert.ok('config' in registerCalls[0], 'config should be registered in the DI container');
    assert.ok('configService' in registerCalls[0], 'configService should be registered in the DI container');
  });
  
  await it('should return the same instance when getInstance is called multiple times', async () => {
    const { mockApp } = setupTest();
    
    const instance1 = ConfigService.getInstance(mockApp);
    const instance2 = ConfigService.getInstance(mockApp);
    
    assert.strictEqual(instance1, instance2, 'getInstance should return the same instance');
  });
  
  await it('should retrieve all plugins with getPlugins', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    const testConfig: Partial<AppConfig> = {
      plugins: [
        { name: 'plugin-1', settings: { enabled: true } },
        { name: 'plugin-2', settings: { enabled: false } },
        { name: 'plugin-3', settings: {} }
      ]
    };
    
    await configService.load(testConfig as AppConfig, {});
    
    const plugins = configService.getPlugins();
    assert.strictEqual(plugins.length, 3, 'Should return all plugins');
    assert.deepStrictEqual(
      plugins.map(p => p.name), 
      ['plugin-1', 'plugin-2', 'plugin-3'], 
      'Should return plugins in correct order'
    );
  });
  
  await it('should retrieve only enabled plugins with getEnabledPlugins', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    const testConfig: Partial<AppConfig> = {
      plugins: [
        { name: 'plugin-1', settings: { enabled: true } },
        { name: 'plugin-2', settings: { enabled: false } },
        { name: 'plugin-3', settings: {} }  // Default is enabled
      ]
    };
    
    await configService.load(testConfig as AppConfig, {});
    
    const enabledPlugins = configService.getEnabledPlugins();
    assert.strictEqual(enabledPlugins.length, 2, 'Should return only enabled plugins');
    assert.deepStrictEqual(
      enabledPlugins.map(p => p.name), 
      ['plugin-1', 'plugin-3'], 
      'Should return enabled plugins correctly'
    );
  });
  
  await it('should retrieve only disabled plugins with getDisabledPlugins', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    const testConfig: Partial<AppConfig> = {
      plugins: [
        { name: 'plugin-1', settings: { enabled: true } },
        { name: 'plugin-2', settings: { enabled: false } },
        { name: 'plugin-3', settings: {} }  // Default is enabled
      ]
    };
    
    await configService.load(testConfig as AppConfig, {});
    
    const disabledPlugins = configService.getDisabledPlugins();
    assert.strictEqual(disabledPlugins.length, 1, 'Should return only disabled plugins');
    assert.deepStrictEqual(
      disabledPlugins.map(p => p.name), 
      ['plugin-2'], 
      'Should return disabled plugins correctly'
    );
  });
  
  await it('should handle empty plugins array correctly', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    const testConfig: Partial<AppConfig> = {
      plugins: []
    };
    
    await configService.load(testConfig as AppConfig, {});
    
    assert.strictEqual(configService.getPlugins().length, 0, 'getPlugins should return empty array');
    assert.strictEqual(configService.getEnabledPlugins().length, 0, 'getEnabledPlugins should return empty array');
    assert.strictEqual(configService.getDisabledPlugins().length, 0, 'getDisabledPlugins should return empty array');
  });
  
  await it('should handle undefined plugins correctly', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    // Load empty config
    await configService.load({} as AppConfig, {});
    
    assert.strictEqual(configService.getPlugins().length, 0, 'getPlugins should return empty array when plugins is undefined');
    assert.strictEqual(configService.getEnabledPlugins().length, 0, 'getEnabledPlugins should return empty array when plugins is undefined');
    assert.strictEqual(configService.getDisabledPlugins().length, 0, 'getDisabledPlugins should return empty array when plugins is undefined');
  });
}); 