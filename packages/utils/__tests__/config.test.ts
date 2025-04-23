import { test, describe } from 'node:test';
import { strictEqual, deepStrictEqual, ok, fail } from 'node:assert';
import { z } from 'zod';
import { 
  configSchema, 
  emitterSchema, 
  validateSchema, 
  parseConfig,
  dotGet,
  dotSet,
  dotExists
} from '../src/config';
import { AppConfig } from '@ayazmo/types';

describe('Configuration Validation', async () => {
  // Complete configuration tests
  await describe('Complete config validation', async () => {
    await test('should validate a complete valid configuration', () => {
      const config = {
        app: {
          server: {
            port: 3000,
            host: "localhost"
          },
          emitter: {
            type: 'redis',
            queues: [
              {
                name: 'rmq',
                options: {
                  defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: 100,
                    attempts: 3,
                    backoff: {
                      type: 'exponential',
                      delay: 5000
                    }
                  }
                },
                publishOn: ['comment.create', 'comment.delete']
              }
            ],
            workers: [
              {
                queueName: 'rmq',
                options: {
                  name: 'rmq-service',
                  concurrency: 1
                }
              }
            ]
          },
          redis: {
            host: 'localhost',
            port: 6379
          },
          enabledAuthProviders: ['SSO']
        },
        plugins: [
          {
            name: 'test-plugin',
            settings: {
              enabled: true
            }
          }
        ],
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          dbName: 'test-db'
        }
      };
      
      const result = configSchema.safeParse(config);
      ok(result.success);
    });

    await test('should validate a minimal valid configuration', () => {
      const config = {
        app: {
          server: {}
        }
      };
      
      const result = configSchema.safeParse(config);
      ok(result.success);
    });
  });

  // Emitter schema specific tests
  await describe('Emitter schema validation', async () => {
    await test('should validate queue with required properties', () => {
      const emitter = {
        type: 'redis',
        queues: [
          {
            name: 'test-queue',
            publishOn: ['event.test']
          }
        ]
      };
      
      const result = emitterSchema.safeParse(emitter);
      ok(result.success);
    });

    await test('should validate worker with required properties', () => {
      const emitter = {
        type: 'redis',
        workers: [
          {
            queueName: 'test-queue',
            options: {
              name: 'worker-name'
            }
          }
        ]
      };
      
      const result = emitterSchema.safeParse(emitter);
      ok(result.success);
    });

    await test('should reject queue without name', () => {
      const emitter = {
        type: 'redis',
        queues: [
          {
            // name is missing
            publishOn: ['event.test']
          }
        ]
      };
      
      const result = emitterSchema.safeParse(emitter);
      strictEqual(result.success, false);
      if (!result.success) {
        ok(result.error.issues[0].path.includes('name'));
      }
    });

    await test('should reject queue without publishOn', () => {
      const emitter = {
        type: 'redis',
        queues: [
          {
            name: 'test-queue'
            // publishOn is missing
          }
        ]
      };
      
      const result = emitterSchema.safeParse(emitter);
      strictEqual(result.success, false);
      if (!result.success) {
        ok(result.error.issues[0].path.includes('publishOn'));
      }
    });

    await test('should reject worker without queueName', () => {
      const emitter = {
        type: 'redis',
        workers: [
          {
            // queueName is missing
            options: {
              name: 'worker-name'
            }
          }
        ]
      };
      
      const result = emitterSchema.safeParse(emitter);
      strictEqual(result.success, false);
      if (!result.success) {
        ok(result.error.issues[0].path.includes('queueName'));
      }
    });

    await test('should validate BullMQ extra options', () => {
      const emitter = {
        type: 'redis',
        queues: [
          {
            name: 'test-queue',
            options: {
              defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: 100,
                // Extra option not explicitly defined
                priority: 1,
                someCustomOption: 'value'
              }
            },
            publishOn: ['event.test']
          }
        ]
      };
      
      const result = emitterSchema.safeParse(emitter);
      ok(result.success);
    });
  });

  // Utility function tests
  await describe('Validation utility functions', async () => {
    await test('validateSchema should return valid for correct config', () => {
      const config = {
        app: {
          server: {
            port: 3000
          }
        }
      } as AppConfig;
      
      const result = validateSchema(config);
      ok(result.valid);
      strictEqual(result.errors.length, 0);
    });

    await test('validateSchema should return errors for invalid config', () => {
      const config = {
        app: {
          server: {
            port: "not-a-number" // Should be a number
          }
        }
      } as any;
      
      const result = validateSchema(config);
      strictEqual(result.valid, false);
      ok(result.errors.length > 0);
    });

    await test('parseConfig should return parsed config for valid input', () => {
      const config = {
        app: {
          server: {
            port: 3000
          }
        }
      };
      
      const result = parseConfig(config);
      ok(result.valid);
      ok(result.parsed !== null);
      if (result.parsed) {
        strictEqual(result.parsed.app.server?.port, 3000);
      }
    });

    await test('parseConfig should return errors for invalid input', () => {
      const config = {
        app: {
          server: {
            port: "invalid-port"
          }
        }
      };
      
      const result = parseConfig(config);
      strictEqual(result.valid, false);
      strictEqual(result.parsed, null);
      ok(result.errors.length > 0);
    });
  });

  // Dot notation utility tests
  await describe('Dot notation utilities', async () => {
    const testObj = {
      a: {
        b: {
          c: 'value'
        },
        d: [1, 2, 3]
      },
      e: 'top-level'
    };

    await test('dotGet should retrieve nested values', () => {
      strictEqual(dotGet(testObj, 'a.b.c'), 'value');
      strictEqual(dotGet(testObj, 'e'), 'top-level');
      strictEqual(dotGet(testObj, 'a.d.1'), 2);
      strictEqual(dotGet(testObj, 'non.existent.path', 'default'), 'default');
    });

    await test('dotSet should set nested values', () => {
      const obj = { ...testObj };
      dotSet(obj, 'a.b.c', 'new-value');
      strictEqual(obj.a.b.c, 'new-value');
      
      dotSet(obj, 'a.new.path', 'created');
      strictEqual(obj.a.new.path, 'created');
    });

    await test('dotExists should check if path exists', () => {
      ok(dotExists(testObj, 'a.b.c'));
      strictEqual(dotExists(testObj, 'a.b.nonexistent'), false);
      ok(dotExists(testObj, 'e'));
    });
  });

  // Real-world configuration examples
  await describe('Real-world config examples', async () => {
    await test('should validate the comment-service config', () => {
      const config = {
        app: {
          server: {
            port: 3000,
            host: "0.0.0.0",
          },
          eventEmitterType: "redis",
          enabledAuthProviders: [
            'SSO'
          ],
          redis: {
            host: 'localhost',
            port: 6379,
            db: 2
          },
          emitter: {
            type: "redis",
            queues: [
              {
                name: "rmq",
                options: {
                  defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: 100,
                    attempts: 3,
                    backoff: {
                      type: 'exponential',
                      delay: 5000,
                    },
                  },
                },
                publishOn: ['comment.create', 'comment.delete', 'comment.update', 'comment.republish']
              }
            ]
          }
        },
        admin: {
          enabled: true,
          enabledAuthProviders: ['adminSSO'],
        },
        database: {
          host: "localhost",
          port: 5432,
          dbName: "comments",
          schema: "comments"
        },
        plugins: [
          {
            name: "@col/ayazmo-plugin-sso",
            settings: {
              private: false
            }
          },
          {
            name: "ayazmo-plugin-comments",
            settings: {
              private: false,
              defaultStatus: 'pending',
              displayStatus: ['pending', 'approved', 'deleted']
            }
          }
        ]
      };
      
      const result = configSchema.safeParse(config);
      ok(result.success);
    });

    await test('should validate the messaging-service config with workers', () => {
      const config = {
        app: {
          server: {
            port: 3001,
            host: "0.0.0.0",
          },
          emitter: {
            type: "redis",
            workers: [{
              queueName: "rmq",
              options: {
                name: "rmq-service",
                removeOnComplete: true,
                removeOnFail: 100,
                concurrency: 1
              }
            }]
          }
        },
        database: {
          host: "localhost",
          port: 5432,
          dbName: "messaging"
        },
        plugins: []
      };
      
      const result = configSchema.safeParse(config);
      ok(result.success);
    });
  });
}); 