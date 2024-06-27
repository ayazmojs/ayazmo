import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Determine the environment and construct the filename
const environment = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `.env.${environment}`);

// Check if the environment-specific file exists
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config(); // Load the default .env file
}

export default {
  database: {
    type: 'postgresql',
  },
  app: {
    eventEmitterType: 'redis',
    cors: {
      hook: 'preHandler',
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    },
    // Add Redis connection configuration
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
    cache: {
      storage: { type: 'memory' },
      ttl: 60 * 5, // 5 minutes
      stale: 60, // 1 minute
    },
    enabledAuthProviders: [
      'test'
    ]
  },
  admin: {
    enabled: true,
  },
  plugins: [
    {
      name: 'ayazmo-plugin-test',
      settings: {
        private: true,
      }
    },
    {
      name: "ayazmo-plugin-comments",
      settings: {
        private: false
      }
    },
    {
      name: 'ayazmo-plugin-rabbitmq',
      settings: {
      }
    },
    {
      name: 'new-plugin-name-test',
      settings: {
        private: false,
        options: {
          key: 'value',
          anotherOption: true
        }
      }
    }
  ]
}