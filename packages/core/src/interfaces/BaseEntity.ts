import { PrimaryKey, Property, JsonType } from '@mikro-orm/core';
import { v4 as uuidv4, } from 'uuid';

export abstract class BaseEntity {

  @PrimaryKey()
  id = uuidv4();

  @Property()
  createdAt = new Date();

  @Property({ onUpdate: () => new Date(), nullable: true })
  updatedAt = new Date();

  @Property({ type: JsonType, nullable: true })
  meta: any;

}