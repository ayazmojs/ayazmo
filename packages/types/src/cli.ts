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
