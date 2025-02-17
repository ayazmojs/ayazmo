import path from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const pluginConfig = {
  plugins: [
    {
      name: 'ayazmo-plugin-private',
      settings: {
        private: true,
        path: path.join(__dirname, 'plugins')
      }
    },
    {
      name: 'ayazmo-plugin-public',
      settings: {
        private: false
      }
    }
  ]
}
