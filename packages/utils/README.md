# Ayazmo Utilities

This package provides a collection of utility functions for the Ayazmo framework.

## Installation

```bash
npm install @ayazmo/utils
```

## Features

- Configuration helpers
- File system utilities
- Package management utilities
- String utilities
- Auth utilities
- Error handling
- Testing utilities

## Testing Utilities

The package includes comprehensive testing utilities that make it easier to test Ayazmo applications and plugins:

- **Server Builder**: Create temporary Ayazmo server instances for testing
- **Config Registry**: Manage temporary configuration files for tests
- **Host Utilities**: Helper functions for working with server instances in tests

For detailed documentation on the testing utilities, see:
- [Test Utilities Documentation](./src/test-utils/README.md)

### Example Usage

```javascript
import { buildTestServer, cleanupAllTestConfigs } from '@ayazmo/utils'

describe('my plugin test', () => {
  let server, fastifyInstance

  before(async () => {
    server = await buildTestServer('my-test', {
      // Test configuration
      plugins: {
        'my-plugin': {
          // Plugin configuration
        }
      }
    })
    
    fastifyInstance = await server.startAndGetInstance()
  })
  
  after(async () => {
    await server.cleanup()
    await cleanupAllTestConfigs()
  })
  
  it('should test my plugin', async () => {
    // Your test code here
  })
})
```

## API Documentation

For full API documentation, see the JSDoc comments in the source code.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 