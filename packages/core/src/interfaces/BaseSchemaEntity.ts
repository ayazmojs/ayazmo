import { EntitySchema } from '@ayazmo/types';

export interface BaseSchemaEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  meta: Record<string, any>;
}

const BaseSchemaEntity = new EntitySchema<BaseSchemaEntity>({
    name: 'BaseSchemaEntity',
    abstract: true,
    properties: {
      id: { type: 'string', length: 26, primary: true },
      createdAt: { type: 'Date', onCreate: () => new Date(), nullable: true },
      updatedAt: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date(), nullable: true },
      meta: { type: 'json', nullable: true },
    },
  });

export { BaseSchemaEntity };
export default BaseSchemaEntity;
