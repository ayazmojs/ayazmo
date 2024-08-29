export const appConfigDefaultQueue = {
  app: {
    emitter: {
      type: 'redis'
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

export const appConfigQueue = {
  app: {
    emitter: {
      type: 'redis',
      queues: [
        {
          name: 'eventsQueue',
          options: {
            defaultJobOptions: {
              removeOnComplete: 100, // Number or true
              removeOnFail: 1000, // Number or true
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
            }
          },
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

export const appConfigFlow = {
  app: {
    emitter: {
      type: 'redis',
      queues: [
        {
          name: 'eventsQueue',
          options: {
            defaultJobOptions: {
              removeOnComplete: 100, // Number or true
              removeOnFail: 1000, // Number or true
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
            }
          }
        },
        {
          name: 'eventsFlow',
          options: {
            defaultJobOptions: {
              removeOnComplete: 100, // Number or true
              removeOnFail: 1000, // Number or true
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
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