import { 
  AyazmoDbCredentials, 
  AyazmoPluginChoice, 
  AyazmoSelectedPlugin, 
  AyazmoMigrationResult 
} from '@ayazmo/types'

export function validatePlugin(pluginName: string | undefined, plugins: Array<any>): boolean | never {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new Error('No plugins enabled!')
  }

  if (pluginName) {
    const pluginExists = plugins.some(p => p.name === pluginName)
    if (!pluginExists) {
      throw new Error(`Plugin "${pluginName}" is not enabled in your configuration. Please check your config file.`)
    }
  }
  return true
}

export function determineSelectedPlugin(
  options: { plugin?: string, interactive?: boolean },
  pluginChoice?: AyazmoPluginChoice
): AyazmoSelectedPlugin {
  if (options.plugin) {
    return { type: 'single', value: options.plugin }
  }
  
  if (options.interactive && pluginChoice) {
    return {
      type: pluginChoice.type === 'specific' ? 'single' : 'all',
      value: pluginChoice.value
    }
  }
  
  return { type: 'all', value: 'all' }
}

export function mergeDbConfig(globalConfig: any, credentials?: AyazmoDbCredentials) {
  if (!credentials) {
    return globalConfig.database
  }

  return {
    ...globalConfig.database,
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password,
    dbName: credentials.dbName,
  }
}

export function resolveSchema(env: NodeJS.ProcessEnv, globalConfig: any): string {
  return env.DB_SCHEMA ?? globalConfig.database?.schema ?? 'public'
}

export function createMigrationResult(
  success: boolean,
  migrations?: string[],
  error?: Error
): AyazmoMigrationResult {
  return {
    success,
    ...(migrations && { appliedMigrations: migrations }),
    ...(error && { error })
  }
} 