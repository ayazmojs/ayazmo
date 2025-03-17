export interface IBaseOrmConfig {
  entities: string[]
  entitiesTs: string[]
  baseDir: string
  migrations: {
    snapshot: boolean
    path: string
    emit: string
    safe?: boolean
    dropTables?: boolean
    snapshotPath?: string
  }
  discovery?: {
    warnWhenNoEntities: boolean
    requireEntitiesArray: boolean
    disableDynamicFileAccess: boolean
  }
}

export interface IPluginPrompt {
  selectedPlugin: string
}

export interface ITypePrompt {
  type: 'entities' | 'empty'
}

export interface INamePrompt {
  filename: string
}

export interface AyazmoDbCredentials {
  host: string
  port: number
  user: string
  password: string
  dbName: string
}

export interface AyazmoMigrationOptions {
  interactive?: boolean
  plugin?: string
  dbCredentials?: AyazmoDbCredentials
}

export interface AyazmoMigrationResult {
  success: boolean
  error?: Error
  appliedMigrations?: string[]
}

export interface AyazmoPluginChoice {
  type: 'specific' | 'all'
  value: string
}

export interface AyazmoSelectedPlugin {
  type: 'all' | 'single'
  value: string
}
