export default {
  app: {
    emitter: {
      type: 'redis',
      queues: [
        {
          name: 'eventsQueue',
          options: {
            defaultJobOptions: {
              removeOnComplete: true,
              removeOnFail: { count: 0 },
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
            }
          },
          publishOn: ["comment.create"],
          events: {
            'failed': (job, err) => {
              console.log('Job error', job, err);
            }
          }
        },
        {
          name: 'comments',
          options: {
            defaultJobOptions: {
              removeOnComplete: true,
              removeOnFail: { count: 0 },
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
            }
          },
          publishOn: ["comment.create", "comment.delete"],
          transformer: async (payload, type, app) => {
            return payload;
          },
          events: {
            'stalled': (job) => {
              console.log('Job stalled', job);
            }
          }
        }
      ],
      workers: [
        {
          queueName: "eventsQueue",
          options: {
            removeOnComplete: true,
            removeOnFail: { count: 0 },
            concurrency: 1,
            lockDuration: 60000
          },
          events: {
            'error': (err) => {
              console.log('eventsQueue Worker error', err.message);
            }
          }
        },
        {
          queueName: "comments",
          options: {
            removeOnComplete: true,
            removeOnFail: { count: 0 },
            concurrency: 1,
            lockDuration: 60000
          },
          events: {
            'error': (err) => {
              console.log('comments Worker error', err.message);
            }
          }
        }
      ]
    }
  },
  plugins: [
    {
      "name": "ayazmo-plugin-private",
      "settings": {
        "private": true
      }
    },
    {
      "name": "ayazmo-plugin-public",
      "settings": {
        "private": false
      }
    }
  ]
}