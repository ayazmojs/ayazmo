# Ayazmo Test Utilities

This module provides a set of utilities for testing Ayazmo applications and plugins.

## Installation

These utilities are part of the `@ayazmo/utils` package, so no additional installation is required if you're already using Ayazmo.

## Usage

### Server Testing

The `buildTestServer` function creates a temporary Ayazmo server instance for testing:

```javascript
import { buildTestServer, cleanupAllTestConfigs } from '@ayazmo/utils'
import assert from 'node:assert'

let server, fastifyInstance

describe('my plugin tests', () => {
  before(async () => {
    // Create a test server with custom configuration
    server = await buildTestServer('my-plugin-test', {
      // Your test config here
      plugins: {
        'my-plugin': {
          // Plugin configuration
        }
      }
    })
    
    // Start the server and get the Fastify instance
    fastifyInstance = await server.startAndGetInstance()
  })
  
  after(async () => {
    // Cleanup resources after tests
    await server.cleanup()
    // Extra safety to clean all configs
    await cleanupAllTestConfigs()
  })
  
  it('should do something with my plugin', async () => {
    // Your test assertions here
  })
})
```

The `buildTestServer` function uses these defaults:

- **configBaseDir**: Uses `__tests__/temp-configs` in the current working directory
- **logLevel**: Uses `process.env.LOG_LEVEL` if set, otherwise defaults to `'info'`

You can override these defaults if needed:

```javascript
server = await buildTestServer('my-test', testConfig, {
  // Override the defaults
  configBaseDir: 'custom/path/to/configs',
  logLevel: 'debug'
})
```

### Configuration Utilities

You can create temporary test configuration files:

```javascript
import { createTestConfig, cleanupTestConfig } from '@ayazmo/utils'

// Create a temporary config for your test
const configPath = await createTestConfig('my-test', {
  app: {
    // Your app config
  },
  plugins: {
    // Your plugins config
  }
})

// Do something with the config

// Clean up when done
await cleanupTestConfig(configPath)
```

### Host Utilities

Get the host URL from a Fastify instance:

```javascript
import { getTestHost } from '@ayazmo/utils'

// Get the host URL for making HTTP requests in tests
const host = getTestHost(fastifyInstance)
const response = await fetch(`${host}/my-endpoint`)
```

## API Reference

### Server Builder

#### `buildTestServer(testName, testConfig, options)`

Creates a test server instance with a temporary configuration file using the `@ayazmo/core` Server implementation.

- **testName**: String identifier for the test
- **testConfig**: Configuration object for the test
- **options**: Optional configuration:
  - **configBaseDir**: Base directory for test configs (default: `__tests__/temp-configs`)
  - **logLevel**: Log level for the test (default: `process.env.LOG_LEVEL || 'info'`)

Returns a server instance with the following additional methods:

- **startAndGetInstance()**: Starts the server and returns the Fastify instance
- **cleanup()**: Cleans up the server and temporary files

### Config Registry

#### `createTestConfig(testName, configContent, options)`

Creates a temporary configuration file.

- **testName**: String identifier for the test
- **configContent**: Configuration object
- **options**: Optional settings
  - **baseDir**: Base directory for test configs

#### `cleanupTestConfig(configPath)`

Removes a temporary test configuration.

- **configPath**: Path to the config file to clean up

#### `cleanupAllTestConfigs()`

Cleans up all registered test configurations.

### Host Utilities

#### `getTestHost(fastifyInstance)`

Gets the host URL from a Fastify instance.

- **fastifyInstance**: Fastify/Ayazmo instance

Returns a string with the host URL. 