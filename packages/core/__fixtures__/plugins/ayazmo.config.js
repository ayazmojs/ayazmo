import path from 'node:path'
import { __dirname } from '../../__fixtures__/build-server'

export default {
  app: {
    server: {
      port: process.env.PORT || 0,
      host: process.env.HOST || '0.0.0.0'
    },
    enabledAuthProviders: [
      'SSO'
    ],
    emitter: {
      type: 'memory'
    },
    websocket: {
      options: {
        maxPayload: 1048576, // 1MB
        clientTracking: true
      }
    }
  },
  admin: {
    enabledAuthProviders: [
      'adminSSO'
    ],
    roles: {
      admin: (admin) => {
        return admin.role === 'admin'
      },
      editor: (admin) => {
        return admin.role === 'editor'
      }
    }
  },
  corePlugins: {
    'health-check': {
      route: '/health',
      handler: async (request, reply, app) => {
        reply.code(200).send({ content: 'health-check' })
      }
    }
  },
  plugins: [
    {
      name: 'ayazmo-plugin-test',
      path: path.resolve(path.join(__dirname, 'plugins')),
      settings: {
        private: true,
        admin: {
          routes: [
            {
              method: 'GET',
              url: '/v1/override-success',
              handler: async (request, reply) => {
                reply.code(200).send({ content: 'override-success' })
              }
            },
            {
              method: 'GET',
              url: '/v1/role-access-success',
              preHandler: [['adminSSO', 'admin']],
              handler: async (request, reply) => {
                reply.code(200).send({ content: 'override-success' })
              }
            }
          ]
        }
      }
    },
    {
      name: 'ayazmo-plugin-service-override',
      path: path.resolve(path.join(__dirname, 'plugins')),
      settings: {
        private: true,
        allowServiceOverride: true,
        queryFilters: {
          fetchById: args => {
            return {
              id: '1',
              status: 'rejected'
            }
          }
        }
      }
    }
  ]
}
