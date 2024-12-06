export default {
  app: {
    server: {
      port: process.env.PORT || 0,
      host: process.env.HOST || '0.0.0.0'
    },
    enabledAuthProviders: [
      'SSO'
    ]
  },
  admin: {
    enabled: true,
    enabledAuthProviders: [
      'adminSSO'
    ],
    roles: {
      isAdmin: (admin) => {
        return admin && admin.roles.includes('admin')
      },
      editor: (admin) => admin.role === 'editor',
      viewer: (admin) => admin.role === 'viewer'
    }
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'ayazmo-user',
    password: process.env.DB_PASSWORD || 'ayazmo-password',
    dbName: process.env.DB_DATABASE || 'ayazmo-dev',
    debug: false,
    schema: process.env.DB_DATABASE || 'public'
  },
  plugins: [
    {
      name: 'ayazmo-plugin-test',
      settings: {
        private: false
      }
    }
  ]
}
