import path from 'node:path'

export const PLUGINS_BUILT_ROOT = path.join(process.cwd(), 'dist', 'plugins')
export const PLUGINS_ROOT = path.join(process.cwd(), 'src', 'plugins')
export const APP_TEMPLATE_REPO_NAME = 'ayazmojs/ayazmo-app-template'
export const ENTITIES_TS_PATH = './src/plugins/*/src/entities/*.ts'
export const ENTITIES_JS_PATH = './src/plugins/*/dist/entities/*.js'
export const GLOBAL_CONFIG_FILE_NAME = 'ayazmo.config.js'
