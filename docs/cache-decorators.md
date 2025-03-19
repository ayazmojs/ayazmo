# Cache Decorators for Ayazmo

Ayazmo provides TypeScript decorators for easy method-level caching in your service classes. These decorators leverage the existing cache infrastructure and provide a simple, declarative way to cache method results.

## Available Decorators

### `@Cacheable`

The `@Cacheable` decorator marks a method as cacheable, storing its results in the cache.

```typescript
import { Cacheable } from '@ayazmo/core';

class UserService {
  @Cacheable({ ttl: 300 }) // Cache for 5 minutes
  async getUserById(id: string): Promise<User> {
    // Expensive database operation...
    return user;
  }
}
```

#### Options

- `ttl`: Time-to-live in seconds (how long the result should be cached)
- `stale`: Stale-while-revalidate time in seconds
- `keyGenerator`: Custom function to generate cache keys from method arguments
- `condition`: Function to determine if a result should be cached (returns boolean)
- `keyPrefix`: String prefix to add to generated cache keys

### `@CacheEvict`

The `@CacheEvict` decorator marks a method that should invalidate cache entries when called.

```typescript
import { CacheEvict } from '@ayazmo/core';

class UserService {
  @CacheEvict({ patterns: 'user:*' })
  async updateUser(id: string, data: any): Promise<User> {
    // Update user in database...
    return updatedUser;
  }
}
```

#### Options

- `key`: Specific cache key to invalidate
- `patterns`: Pattern or array of patterns to invalidate (e.g., 'user:*')
- `allEntries`: If true, clears the entire cache
- `beforeInvocation`: If true, invalidates cache before method execution (default: false)
- `keyGenerator`: Function to generate keys to invalidate based on method arguments

## Advanced Usage

### Custom Key Generation

```typescript
class ProductService {
  @Cacheable({
    ttl: 600,
    keyGenerator: (categoryId, options) => `products:${categoryId}:${JSON.stringify(options)}`
  })
  async getProductsByCategory(categoryId: string, options: QueryOptions): Promise<Product[]> {
    // Fetch products...
    return products;
  }
}
```

### Conditional Caching

```typescript
class SearchService {
  @Cacheable({
    ttl: 300,
    condition: (results) => results.length > 0 // Only cache non-empty results
  })
  async search(query: string): Promise<SearchResult[]> {
    // Perform search...
    return results;
  }
}
```

### Dynamic Cache Invalidation

```typescript
class ArticleService {
  @CacheEvict({
    keyGenerator: (article) => [
      `article:${article.id}`,
      `author:${article.authorId}:articles`,
      'latest-articles'
    ]
  })
  async publishArticle(article: Article): Promise<Article> {
    // Publish article...
    return article;
  }
}
```

## Initialization

The cache decorators are automatically initialized when your Ayazmo application starts, provided that a cache service is registered in the dependency injection container.

If you need to manually initialize the decorators (for testing, for example), you can use:

```typescript
import { initCacheableDecorator } from '@ayazmo/core';

// Initialize with your app instance
initCacheableDecorator(app);
```

## Requirements

- TypeScript with decorators enabled (`"experimentalDecorators": true` in tsconfig.json)
- Ayazmo cache service configured and enabled

## Performance Considerations

- Cache keys are generated based on method arguments, so be careful with large objects
- For complex objects, consider providing a custom `keyGenerator` function
- If a method throws an error during execution, the data is not cached 