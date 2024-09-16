import path from 'node:path'
import { __dirname } from '../../__fixtures__/build-server'

export default {
  app: {
    server: {
      port: process.env.PORT || 0,
      host: process.env.HOST || "0.0.0.0",
    },
    emitter: {
      type: 'memory',
    }
  },
  plugins: [
    {
      "name": "ayazmo-plugin-test",
      path: path.resolve(path.join(__dirname, 'plugins')),
      "settings": {
        "private": true
      }
    }
  ]
}