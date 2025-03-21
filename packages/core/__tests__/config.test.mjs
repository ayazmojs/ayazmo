import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConfigService } from '../dist/config/ConfigService.js';
import fs from 'node:fs';
import path from 'node:path';

describe('ConfigService', async () => {
  // Set up test environment before each test
  function setupTest() {
    // Create a mock app
    const mockApp = {
      diContainer: {
        register: () => {}
      },
      log: {
        info: () => {},
        warn: () => {},
        error: () => {}
      }
    };
    
    // Spy on the register method
    const originalRegister = mockApp.diContainer.register;
    let registerCalls = [];
    mockApp.diContainer.register = function(registration) {
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
    
    const defaultConfig = {
      admin: {
        enabled: true,
        opts: { prefix: '/admin' }
      }
    };
    
    const userConfig = {
      admin: {
        enabled: false,
        opts: { prefix: '/custom-admin' }
      }
    };
    
    const configService = ConfigService.getInstance(mockApp);
    const config = await configService.load(userConfig, defaultConfig);
    
    assert.strictEqual(config.admin.enabled, false, 'User config should override default config');
    assert.strictEqual(config.admin.opts.prefix, '/custom-admin', 'User config value should be used');
    assert.strictEqual(registerCalls.length, 1, 'diContainer.register should be called once');
  });
  
  await it('should register both config and configService in the DI container', async () => {
    const { mockApp, registerCalls } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    const defaultConfig = {
      admin: {
        enabled: true,
        opts: { prefix: '/admin' }
      }
    };
    
    await configService.load({}, defaultConfig);
    
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
  
  await it('should apply environment variable overrides', async () => {
    const { mockApp } = setupTest();
    
    // Save the original env
    const originalEnv = process.env;
    
    try {
      // Set test environment variables with single underscores
      process.env = {
        ...process.env,
        AYAZMO_ADMIN_ENABLED: 'false',
        AYAZMO_APP_SERVER_PORT: '4000',
        AYAZMO_APP_CACHE_TTL: '120',
        AYAZMO_PLUGINS_0_NAME: 'test-plugin',
        AYAZMO_PLUGINS_0_SETTINGS_DEBUG: 'true'
      };
      
      const configService = ConfigService.getInstance(mockApp);
      
      const defaultConfig = {
        admin: {
          enabled: true,
          opts: { prefix: '/admin' }
        },
        app: {
          server: {
            port: 3000
          },
          cache: {
            ttl: 60
          }
        },
        plugins: []
      };
      
      const config = await configService.load({}, defaultConfig);
      
      // Check that environment variables override the config
      assert.strictEqual(config.admin.enabled, false, 'Environment variable should override admin.enabled');
      assert.strictEqual(config.app.server.port, 4000, 'Environment variable should override app.server.port as a number');
      assert.strictEqual(config.app.cache.ttl, 120, 'Environment variable should override app.cache.ttl as a number');
      assert.strictEqual(config.plugins[0].name, 'test-plugin', 'Environment variable should create array elements');
      assert.strictEqual(config.plugins[0].settings.debug, true, 'Environment variable should parse boolean values');
    } finally {
      // Restore the original env
      process.env = originalEnv;
    }
  });
  
  await it('should handle dot notation in environment variables', async () => {
    const { mockApp } = setupTest();
    
    // Save the original env
    const originalEnv = process.env;
    
    try {
      // Test both underscore and dot notation
      process.env = {
        ...process.env,
        'AYAZMO_APP.SERVER.HOST': 'example.com',  // Dot notation
        AYAZMO_APP_SERVER_PORT: '5000'           // Underscore notation
      };
      
      const configService = ConfigService.getInstance(mockApp);
      await configService.load({}, {});
      
      // Both formats should work
      assert.strictEqual(configService.get('app.server.host'), 'example.com', 'Dot notation should work in env vars');
      assert.strictEqual(configService.get('app.server.port'), 5000, 'Underscore notation should work in env vars');
    } finally {
      // Restore the original env
      process.env = originalEnv;
    }
  });
  
  await it('should handle different types of environment variable values', async () => {
    const { mockApp } = setupTest();
    
    // Save the original env
    const originalEnv = process.env;
    
    try {
      // Set test environment variables with different types
      process.env = {
        ...process.env,
        AYAZMO_STRING_VALUE: 'string-value',
        AYAZMO_NUMBER_VALUE: '42',
        AYAZMO_BOOLEAN_TRUE: 'true',
        AYAZMO_BOOLEAN_FALSE: 'false'
      };
      
      const configService = ConfigService.getInstance(mockApp);
      await configService.load({}, {});
      
      // Check type conversions using get() method with dot notation
      assert.strictEqual(typeof configService.get('string.value'), 'string', 'String value should remain a string');
      assert.strictEqual(configService.get('string.value'), 'string-value', 'String value should be preserved');
      
      assert.strictEqual(typeof configService.get('number.value'), 'number', 'Number string should be converted to number');
      assert.strictEqual(configService.get('number.value'), 42, 'Number value should be parsed correctly');
      
      assert.strictEqual(typeof configService.get('boolean.true'), 'boolean', 'Boolean string should be converted to boolean');
      assert.strictEqual(configService.get('boolean.true'), true, 'Boolean true should be parsed correctly');
      assert.strictEqual(configService.get('boolean.false'), false, 'Boolean false should be parsed correctly');
    } finally {
      // Restore the original env
      process.env = originalEnv;
    }
  });
  
  await it('should get config values using dot notation', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    const testConfig = {
      app: {
        server: {
          port: 3000,
          host: 'localhost'
        },
        cache: {
          enabled: true,
          ttl: 60
        }
      },
      admin: {
        enabled: true
      },
      plugins: [
        {
          name: 'test-plugin',
          settings: {
            debug: true
          }
        }
      ]
    };
    
    await configService.load(testConfig, {});
    
    // Test simple paths
    assert.strictEqual(configService.get('app.server.port'), 3000, 'Should get nested numeric value');
    assert.strictEqual(configService.get('app.server.host'), 'localhost', 'Should get nested string value');
    assert.strictEqual(configService.get('admin.enabled'), true, 'Should get boolean value');
    
    // Test array access
    assert.strictEqual(configService.get('plugins.0.name'), 'test-plugin', 'Should get array element property');
    
    // Test default values
    assert.strictEqual(configService.get('nonexistent.path', 'default'), 'default', 'Should return default value for nonexistent path');
    assert.strictEqual(configService.get('app.nonexistent.value', 42), 42, 'Should return default value for partially existent path');
  });
  
  await it('should set config values using dot notation', async () => {
    const { mockApp, registerCalls } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    const testConfig = {
      app: {
        server: {
          port: 3000
        }
      }
    };
    
    await configService.load(testConfig, {});
    registerCalls.length = 0; // Reset register calls after load
    
    // Update existing value
    configService.set('app.server.port', 4000);
    assert.strictEqual(configService.get('app.server.port'), 4000, 'Should update existing value');
    assert.strictEqual(registerCalls.length, 1, 'Should register updated config');
    
    // Create new nested path
    configService.set('new.deep.path', 'value');
    assert.strictEqual(configService.get('new.deep.path'), 'value', 'Should create new nested path');
    
    // Set value in an array
    configService.set('app.features', ['feature1', 'feature2']);
    assert.deepStrictEqual(configService.get('app.features'), ['feature1', 'feature2'], 'Should set array value');
    
    // Add property to existing object
    configService.set('app.server.timeout', 30);
    assert.strictEqual(configService.get('app.server.timeout'), 30, 'Should add property to existing object');
  });
  
  await it('should load variables from .env file', async () => {
    const { mockApp } = setupTest();
    
    // Create a temporary .env file
    const tempEnvPath = path.join(process.cwd(), '.env');
    const envFileExists = fs.existsSync(tempEnvPath);
    let originalEnvContent;
    
    // Save original content if file exists
    if (envFileExists) {
      originalEnvContent = fs.readFileSync(tempEnvPath, 'utf8');
    }
    
    try {
      // Write test .env file with updated format
      const envContent = `
# Test .env file
AYAZMO_ENV_TEST_VALUE=env-file-value
AYAZMO_ENV_TEST_NUMBER=42
AYAZMO_ENV_TEST_BOOL=true
`;
      fs.writeFileSync(tempEnvPath, envContent);
      
      // Save original env
      const originalEnv = { ...process.env };
      
      try {
        // Clear any existing vars with these names
        delete process.env.AYAZMO_ENV_TEST_VALUE;
        delete process.env.AYAZMO_ENV_TEST_NUMBER;
        delete process.env.AYAZMO_ENV_TEST_BOOL;
        
        const configService = ConfigService.getInstance(mockApp);
        await configService.load({}, {});
        
        // Check that .env variables were loaded correctly
        assert.strictEqual(configService.get('env.test.value'), 'env-file-value', 
          'Should load string value from .env file');
        assert.strictEqual(configService.get('env.test.number'), 42, 
          'Should load and convert number from .env file');
        assert.strictEqual(configService.get('env.test.bool'), true, 
          'Should load and convert boolean from .env file');
      } finally {
        // Restore original env
        process.env = originalEnv;
      }
    } finally {
      // Restore or remove .env file
      if (envFileExists) {
        fs.writeFileSync(tempEnvPath, originalEnvContent);
      } else {
        try {
          fs.unlinkSync(tempEnvPath);
        } catch (e) {
          // Ignore errors trying to delete the file
        }
      }
    }
  });
  
  await it('should retrieve all plugins with getPlugins', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    const testConfig = {
      plugins: [
        { name: 'plugin-1', settings: { enabled: true } },
        { name: 'plugin-2', settings: { enabled: false } },
        { name: 'plugin-3', settings: {} }
      ]
    };
    
    await configService.load(testConfig, {});
    
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
    
    const testConfig = {
      plugins: [
        { name: 'plugin-1', settings: { enabled: true } },
        { name: 'plugin-2', settings: { enabled: false } },
        { name: 'plugin-3', settings: {} }  // Default is enabled
      ]
    };
    
    await configService.load(testConfig, {});
    
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
    
    const testConfig = {
      plugins: [
        { name: 'plugin-1', settings: { enabled: true } },
        { name: 'plugin-2', settings: { enabled: false } },
        { name: 'plugin-3', settings: {} }  // Default is enabled
      ]
    };
    
    await configService.load(testConfig, {});
    
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
    
    const testConfig = {
      plugins: []
    };
    
    await configService.load(testConfig, {});
    
    assert.strictEqual(configService.getPlugins().length, 0, 'getPlugins should return empty array');
    assert.strictEqual(configService.getEnabledPlugins().length, 0, 'getEnabledPlugins should return empty array');
    assert.strictEqual(configService.getDisabledPlugins().length, 0, 'getDisabledPlugins should return empty array');
  });
  
  await it('should handle undefined plugins correctly', async () => {
    const { mockApp } = setupTest();
    
    const configService = ConfigService.getInstance(mockApp);
    
    // Load empty config
    await configService.load({}, {});
    
    assert.strictEqual(configService.getPlugins().length, 0, 'getPlugins should return empty array when plugins is undefined');
    assert.strictEqual(configService.getEnabledPlugins().length, 0, 'getEnabledPlugins should return empty array when plugins is undefined');
    assert.strictEqual(configService.getDisabledPlugins().length, 0, 'getDisabledPlugins should return empty array when plugins is undefined');
  });
}); 