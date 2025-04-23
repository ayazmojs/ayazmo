/**
 * Type definitions for Fastify plugins used by Ayazmo
 * 
 * This file re-exports type definitions from Fastify plugins that are part
 * of the Ayazmo core. It ensures that plugin typings are available
 * throughout the Ayazmo ecosystem without requiring explicit imports.
 */

// Re-export WebSocket plugin types
import '@fastify/websocket';

// Future plugin re-exports would go here
// Example: import '@fastify/jwt';
// Example: import '@fastify/cors';
// Example: import '@fastify/multipart';

// This is a module file that only exists for its side effects (imports)
// It doesn't export anything directly
export {}; 