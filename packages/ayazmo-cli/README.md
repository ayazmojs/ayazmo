# Ayazmo CLI

Ayazmo CLI to streamline the developers experience. Scaffold a new API, manage migrations and more.

## Installation

```bash
# Using npm
npm install ayazmo

# Using yarn
yarn add ayazmo
```

## CLI Usage

```bash
# Create a new Ayazmo application
ayazmo app:create

# Create a migration
ayazmo migration:create

# Run migrations
ayazmo migration:up

# Roll back migrations
ayazmo migration:down

# Create a plugin
ayazmo plugin:create

# Install a plugin
ayazmo plugin:install <plugin-name>
# or
ayazmo install <plugin-name>
# or
ayazmo add <plugin-name>

# Remove a plugin
ayazmo remove <plugin-name>
```

## Using as a Library

You can also use Ayazmo CLI as a library in your code. This is useful for programmatically running migrations, creating applications, or working with plugins.

### Importing Individual Utilities

```typescript
// Import specific utility functions
import { runMigrations } from 'ayazmo/utils/run-migrations';
import { createMigration } from 'ayazmo/utils/create-migration';
import { installPlugin } from 'ayazmo/utils/install-plugin';
import { removePlugin } from 'ayazmo/utils/remove-plugin';
import { CliLogger } from 'ayazmo';

// Run migrations programmatically
async function migrateDatabase() {
  try {
    const result = await runMigrations({
      interactive: false,
      plugin: 'my-plugin' // Optional: target a specific plugin
    });
    
    if (result.success) {
      CliLogger.info('Migration successful');
    } else {
      CliLogger.error('Migration failed');
    }
  } catch (error) {
    CliLogger.error('Migration error:', error);
  }
}
```

### Importing All Utilities

You can also import all utilities at once:

```typescript
import { utils } from 'ayazmo';

// Now you can access all utility functions
utils.runMigrations({ interactive: false });
utils.createMigration();
// etc.
```

### Available Utilities

The following utilities are available for import:

- `runMigrations` - Run database migrations
- `createMigration` - Create new migration files
- `createApplication` - Scaffold a new Ayazmo application
- `createPlugin` - Create a new Ayazmo plugin
- `installPlugin` - Install a plugin
- `removePlugin` - Remove a plugin
- `downMigrations` - Roll back migrations
- `CliLogger` - Logger utility for CLI output
- And many more (see `src/utils` directory for all available utilities)

## License

MIT 