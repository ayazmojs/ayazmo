# Core Plugins in Ayazmo

Core plugins are an integral part of the Ayazmo framework that provide essential functionality directly within the framework itself. Unlike regular plugins which are installed separately, core plugins are bundled with Ayazmo and can be enabled, disabled, or configured through application settings.

## Core Plugin Architecture

Core plugins follow the same plugin architecture principles as regular Ayazmo plugins, but are located within the framework itself. This makes them:

- Always available without needing to install additional packages
- Optimized for the framework's core functionality
- Easily configurable through the application's configuration system
- Overridable by third-party plugins when custom functionality is needed

### Directory Structure

Core plugins are located in the `packages/core/src/core-plugins` directory with the following structure:

```
packages/core/src/core-plugins/
├── core-plugin-registry.ts      # Registry of all core plugins
├── core-plugin-manager.ts       # Manager responsible for loading core plugins
└── [plugin-name]/               # Directory for each core plugin
    └── src/                     # Source code for the plugin
        ├── bootstrap.ts         # Entry point for the plugin
        └── routes.ts            # Routes defined by the plugin (if any)
```

### Plugin Registration

Core plugins are registered in the `core-plugin-registry.ts` file, which maintains a record of all available core plugins along with their metadata and default configurations.

### Plugin Lifecycle

Core plugins follow a consistent lifecycle:

1. **Registration**: Each plugin is registered in the core plugin registry
2. **Configuration**: Plugins are configured through the application's configuration system
3. **Initialization**: The `bootstrap.ts` file initializes the plugin when Ayazmo starts
4. **Operation**: The plugin provides its functionality during application runtime
5. **Shutdown**: If implemented, the plugin's `shutdown` function is called when Ayazmo shuts down

## Configuring Core Plugins

Core plugins can be configured in your application's configuration file under the `corePlugins` section:

```js
// ayazmo.config.js
module.exports = {
  // ... other configuration
  corePlugins: {
    // Enable a core plugin with default configuration
    'plugin-name': true,
    
    // Enable a core plugin with custom configuration
    'another-plugin': {
      option1: 'value1',
      option2: 'value2'
    },
    
    // Disable a core plugin
    'disabled-plugin': false
  }
}
```

## Available Core Plugins

### health-check

The health-check plugin provides a simple endpoint to check if your Ayazmo application is running correctly. This is useful for monitoring systems, load balancers, and container orchestration tools.

#### Configuration Options

| Option   | Type              | Default     | Description                                    |
|----------|-------------------|-------------|------------------------------------------------|
| `route`  | string            | `/health`   | The HTTP route where the health check is available |
| `handler`| function          | `undefined` | Custom handler function to implement your own health check logic |
| `enabled`| boolean           | `true`      | Whether the health check plugin is enabled     |

#### Default Behavior

When enabled with default settings, the plugin creates a GET endpoint at `/health` that returns:

```json
{
  "status": "ok"
}
```

with a 200 HTTP status code.

#### Custom Handler

You can provide a custom handler function to implement more complex health checks. The handler function receives the request, reply objects, and the app instance:

```js
// ayazmo.config.js
module.exports = {
  corePlugins: {
    'health-check': {
      route: '/system/health',
      handler: async (request, reply, app) => {
        // Check database connection
        const isDbConnected = await app.diContainer.resolve('dbService').isConnected();
        
        // Check cache service
        const isCacheAvailable = await app.diContainer.resolve('cacheService').ping();
        
        // Return comprehensive health status
        reply.code(200).send({
          status: isDbConnected && isCacheAvailable ? 'ok' : 'degraded',
          services: {
            database: isDbConnected ? 'connected' : 'disconnected',
            cache: isCacheAvailable ? 'available' : 'unavailable'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}
```

#### Testing Custom Handlers

When writing tests for your application with a custom health check handler, make sure to test for the correct response structure. For example:

```js
// Example test for a custom health check handler
it('should successfully call health route with custom handler', async () => {
  const response = await fastifyInstance.inject({
    method: 'GET',
    url: '/health'
  });

  assert.equal(response.statusCode, 200);
  // Test for your custom response structure
  const payload = JSON.parse(response.payload);
  assert.equal(payload.status, 'ok'); // If your handler returns a status field
  assert.ok(payload.services); // If your handler includes a services object
});
```

The plugin system ensures that your custom handler configuration is correctly passed from your application configuration to the route registration.

### websocket

The websocket plugin provides WebSocket support for real-time communication in your Ayazmo application. This is implemented using the `@fastify/websocket` package and offers a consistent configuration interface.

#### Configuration Options

| Option              | Type              | Default      | Description                                  |
|---------------------|-------------------|--------------|----------------------------------------------|
| `options`           | object            | `{}`         | Configuration options for @fastify/websocket |
| `enabled`           | boolean           | `true`       | Whether the websocket plugin is enabled      |
| `enableExampleRoutes` | boolean        | `false`      | Enable example WebSocket routes for testing  |

##### WebSocket Options

The `options` object accepts all options supported by the `@fastify/websocket` package:

| Option              | Type              | Description                                       |
|---------------------|-------------------|---------------------------------------------------|
| `maxPayload`        | number            | Maximum allowed message size in bytes             |
| `clientTracking`    | boolean           | Whether to track clients                          |
| `verifyClient`      | function          | Function to verify client connections             |
| `perMessageDeflate` | boolean/object    | Enable/disable permessage-deflate compression     |

#### Usage Example

```js
// ayazmo.config.js
module.exports = {
  corePlugins: {
    'websocket': {
      options: {
        maxPayload: 1048576, // 1MB max payload
        clientTracking: true
      },
      // Enable example routes for testing
      enableExampleRoutes: true
    }
  }
}
```

#### Creating WebSocket Routes

To create a WebSocket route in your Ayazmo application, add the `websocket: true` property to your route options:

```js
app.get('/live-updates', { websocket: true }, (connection, req) => {
  connection.on('message', message => {
    // Process message
    const data = JSON.parse(message.toString())
    // Send response
    connection.send(JSON.stringify({ status: 'received', data }))
  })
  
  connection.on('close', () => {
    // Handle disconnection
  })
})
```

#### Testing WebSockets

Ayazmo provides an `injectWS` decorator for testing WebSocket endpoints:

```js
// Example test for a WebSocket endpoint
it('should handle WebSocket connections', async () => {
  const ws = await fastify.injectWS('/live-updates')
  
  ws.on('message', data => {
    const response = JSON.parse(data.toString())
    assert.equal(response.status, 'received')
  })
  
  ws.send(JSON.stringify({ type: 'request-data' }))
  
  // Remember to close the connection when done
  ws.terminate()
})
```

## Overriding Core Plugins

You can override any core plugin by creating a third-party plugin with a name that follows the pattern `ayazmo-core-[plugin-name]`. For example, to override the health-check plugin, you would create a plugin named `ayazmo-core-health-check`.

When Ayazmo detects a plugin with this naming pattern, it will use that plugin instead of the built-in core plugin.

## Creating a New Core Plugin

To create a new core plugin, follow these steps:

1. Create a new directory in `packages/core/src/core-plugins/` with your plugin name
2. Create a `src` subdirectory for your plugin's source code
3. Implement at least:
   - `src/bootstrap.ts` - The entry point for your plugin
   - `src/routes.ts` - If your plugin provides HTTP routes
4. Register your plugin in `core-plugin-registry.ts`
5. Document your plugin's functionality and configuration options

### Example: Minimal Core Plugin Template

```typescript
// src/bootstrap.ts
import { z } from 'zod'
import type { AyazmoInstance, PluginConfig } from '@ayazmo/types'

// Plugin configuration schema
export const schema = z.object({
  name: z.literal('my-plugin'),
  settings: z.object({
    enabled: z.boolean().optional().default(true),
    // Add your plugin settings here
  }).optional()
})

// Main bootstrap function
export default async function(app: AyazmoInstance, config: PluginConfig): Promise<{ shutdown?: () => Promise<void> }> {
  app.log.info('Initializing my-plugin core plugin')
  
  // Initialize your plugin
  
  // Return shutdown function
  return {
    shutdown: async () => {
      app.log.info('Shutting down my-plugin core plugin')
      // Cleanup resources
    }
  }
}
```

```typescript
// src/routes.ts
import { AyazmoInstance, PluginSettings } from '@ayazmo/types'

export default async function (app: AyazmoInstance, settings: PluginSettings = {}): Promise<void> {
  // Register your plugin routes
  app.get('/my-plugin/endpoint', async (request, reply) => {
    reply.send({ message: 'Hello from my plugin!' })
  })
}
``` 