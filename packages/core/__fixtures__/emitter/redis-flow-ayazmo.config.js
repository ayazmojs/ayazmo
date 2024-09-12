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
            console.log(payload);
            return payload;
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