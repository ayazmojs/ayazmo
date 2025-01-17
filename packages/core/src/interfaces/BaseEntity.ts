import { PrimaryKey, Property, JsonType } from '@ayazmo/types'
import { ulid } from 'ulidx'

export interface BaseEntityMetadata {
  [key: string]: unknown
}

export abstract class BaseEntity {
  @PrimaryKey({ type: 'string', length: 26 })
  id: string = ulid()

  @Property()
  createdAt: Date = new Date()

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ type: JsonType, nullable: true })
  meta: BaseEntityMetadata | null = null
}
