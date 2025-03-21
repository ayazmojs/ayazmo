# Ayazmo Configuration System

The Ayazmo framework provides a flexible and powerful configuration system that allows you to manage your application's settings across different environments. This document explains how to use the configuration system effectively.

## Overview

The configuration system supports multiple sources for configuration values, with a clear order of precedence:

1. Environment variables (highest priority)
2. `.env` file variables
3. User configuration file (`ayazmo.config.js`)
4. Default configuration (lowest priority)

This allows you to have a base configuration in your code while easily overriding specific values for different environments.

## Basic Usage

### Configuration File

The primary way to configure your Ayazmo application is through the `ayazmo.config.js` file in your project root. This file should export an object matching the `AppConfig` type:

```javascript
// ayazmo.config.js
export default {
  admin: {
    enabled: true,
    opts: {
      prefix: '/admin'
    }
  },
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
  plugins: [
    {
      name: 'my-plugin',
      settings: {
        debug: true
      }
    }
  ]
};
```

### Accessing Configuration Values

In your application code, you can access configuration values using the `ConfigService`:

```typescript
import { ConfigService } from '@ayazmo/core';

// Through dependency injection
function myService({ config, configService }) {
  // Get entire configuration
  const allConfig = config;
  // OR
  const allConfig = configService.getConfig();
  
  // Get specific values using dot notation
  const serverPort = configService.get('app.server.port');
  const cacheEnabled = configService.get('app.cache.enabled');
  
  // With default values for missing properties
  const timeout = configService.get('app.server.timeout', 30);
}
```

## Environment Variables

You can override any configuration value using environment variables, which is particularly useful for deployment environments or sensitive data that shouldn't be committed to your codebase.

### Naming Convention

All environment variables must be prefixed with `AYAZMO_` and can use either underscore notation or dot notation:

- `AYAZMO_APP_SERVER_PORT=3000` (underscore notation)
- `AYAZMO_APP.SERVER.PORT=3000` (dot notation)

Both formats are equivalent and will be correctly parsed by the configuration system.

### Type Conversion

Environment variables are automatically converted to the appropriate type:

- `AYAZMO_APP_SERVER_PORT=3000` → `number`: 3000
- `AYAZMO_APP_CACHE_ENABLED=true` → `boolean`: true
- All other values are kept as strings

For more complex data types like arrays or objects, it's recommended to define them in your configuration file rather than environment variables.

### Working with Arrays

For arrays in configuration, use numeric indices in the environment variable name:

```
AYAZMO_PLUGINS_0_NAME=my-plugin
AYAZMO_PLUGINS_0_SETTINGS_DEBUG=true
AYAZMO_PLUGINS_1_NAME=another-plugin
```

This approach lets you define array elements through individual environment variables. The configuration system will construct the appropriate nested structure based on these indices.

For example, the above variables will create a configuration with:

```javascript
{
  plugins: [
    {
      name: 'my-plugin',
      settings: {
        debug: true
      }
    },
    {
      name: 'another-plugin'
    }
  ]
}
```

This approach is more explicit and less error-prone than trying to parse array syntax from environment variable values.

## .env File Support

You can also place environment variables in a `.env` file in your project root:

```
# .env file
AYAZMO_APP_SERVER_PORT=3000
AYAZMO_ADMIN_ENABLED=false
```

Variables in the `.env` file will be loaded at startup, but will be overridden by actual environment variables if both exist.

## Command-Line Tools

The Ayazmo CLI provides commands to help you work with the configuration system:

### Validating Environment Variables

```bash
ayazmo config:validate
```

This command scans your environment for variables with the `AYAZMO_` prefix and validates them against your application's configuration schema, showing which variables are valid, invalid, or unused.

Options:
- `-t, --template`: Generate a template `.env` file
- `-o, --output <path>`: Path for the template file (default: `.env.example`)

### Generating a Template

```bash
ayazmo config:template
```

This command generates a template `.env` file based on your application's configuration schema, helping you document the available configuration options.

Options:
- `-o, --output <path>`: Path for the template file (default: `.env.example`)

## Advanced Usage

### Setting Configuration Values

You can programmatically update configuration values using the `set` method:

```typescript
// Set a configuration value
configService.set('app.server.port', 4000);

// Set a nested value that doesn't exist yet
configService.set('app.newFeature.enabled', true);
```

When you use `set`, the updated configuration is automatically registered with the dependency injection container, so all services will see the updated value.

### Configuration Validation

The configuration system uses Zod for schema validation, providing:

1. **Type-safe validation** - Ensures your configuration matches the expected structure
2. **Detailed error messages** - Clear feedback when configuration values are invalid
3. **Runtime type checking** - Validates values at runtime match the expected types

Configuration is validated automatically when the server starts. If validation fails, the application will exit with a detailed error message indicating what went wrong. This "fail-fast" approach helps identify configuration problems early in the application lifecycle.

#### Schema Details

The schema validates your configuration against a comprehensive rule set including:

```typescript
// Core schema structure (simplified)
{
  admin?: {
    enabled?: boolean;
    opts?: {
      prefix?: string; // defaults to '/admin'
    };
    // ... other admin options
  };
  plugins: Array<{
    name: string;  // required
    enabled?: boolean;  // defaults to true
    settings?: Record<string, any>;
  }>;
  app: {
    server?: {
      port?: number;  // 1-65535
      host?: string;
      // ... other server options
    };
    // ... other app options
  };
  // ... other options
}
```

#### Manual Validation

You can manually validate your configuration using the ConfigService:

```typescript
import { ConfigService } from '@ayazmo/core';

// Get the instance
const configService = ConfigService.getInstance(app);

// Validate the current configuration
const result = configService.validate();

if (!result.valid) {
  console.error('Configuration validation failed:');
  result.errors.forEach(error => console.error(`- ${error}`));
} else {
  console.log('Configuration is valid');
}
```

### Best Practices

1. **Use dot notation consistently** in your code, even though both formats work for environment variables.

2. **Provide default values** when using `get()` to avoid undefined errors:
   ```typescript
   const timeout = configService.get('app.server.timeout', 30);
   ```

3. **Generate a template** for your project to document available options:
   ```bash
   ayazmo config:template -o .env.example
   ```

4. **Use environment variables for environment-specific values** and secrets, not for code-level configuration.

5. **Validate your environment variables** before deployment to catch misconfigurations early.

## TypeScript Support

The configuration system is fully typed with TypeScript. The `AppConfig` type defines the structure of your configuration object, and the `get<T>()` method allows you to specify the expected return type:

```typescript
// Get with explicit type
const port = configService.get<number>('app.server.port');
const features = configService.get<string[]>('app.features', []);
``` 