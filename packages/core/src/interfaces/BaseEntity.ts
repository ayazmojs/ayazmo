import { PrimaryKey, Property, JsonType, Opt } from '@mikro-orm/core'
import { ulid } from "ulidx";

export abstract class BaseEntity {
  @PrimaryKey()
    id = ulid()

  @Property()
    createdAt?: Date & Opt = new Date()

  @Property({ onUpdate: () => new Date(), nullable: true })
    updatedAt?: Date & Opt = new Date()

  @Property({ type: JsonType, nullable: true })
    meta?: any = null
}
