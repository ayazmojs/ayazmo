# Configuration System

The Ayazmo framework provides a flexible and powerful configuration system that allows you to manage your application's settings across different environments.

## Overview

The configuration system supports multiple sources for configuration values, with a clear order of precedence:

1. Environment variables (highest priority)
2. `.env` file variables
3. User configuration file (`ayazmo.config.js`)
4. Default configuration (lowest priority)

This allows you to have a base configuration in your code while easily overriding specific values for different environments.

## Environment Variables

You can override any configuration value using environment variables, which is particularly useful for deployment environments or sensitive data that shouldn't be committed to your codebase.

### Naming Convention

All environment variables must be prefixed with `AYAZMO_` and can use either underscore notation or dot notation:

```
AYAZMO_APP_SERVER_PORT=3000
```

or 

```
AYAZMO_APP.SERVER.PORT=3000
```

Both formats are equivalent and will be correctly parsed by the configuration system.

### Working with Arrays

For arrays, use numeric indices in the variable name:

```
AYAZMO_PLUGINS_0_NAME=my-plugin
AYAZMO_PLUGINS_0_SETTINGS_DEBUG=true
AYAZMO_PLUGINS_1_NAME=another-plugin
```

## Command-Line Tools

The Ayazmo CLI provides commands to help you work with the configuration system:

### Validating Environment Variables

```bash
ayazmo config:validate
```

This command scans your environment for variables with the `AYAZMO_` prefix and validates them against your application's configuration schema.

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

## Detailed Documentation

For more detailed documentation on the configuration system, including code examples and advanced usage, refer to the [full configuration documentation](./packages/core/docs/configuration.md). 