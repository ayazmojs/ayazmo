import { IEventEmitter } from '@ayazmo/types';

export default abstract class BaseEventEmitter implements IEventEmitter {

  constructor() {}

  async publish(event: string, data: any): Promise<void> {
    throw new Error('Method not implemented.');
  }

  subscribe(event: string, handler: (...args: any[]) => void): void {
    throw new Error('Method not implemented.');
  }

  unsubscribe(event: string, handler: (...args: any[]) => void): void {
    throw new Error('Method not implemented.');
  }

  getEmitter(): any {
    throw new Error('Method not implemented.');
  }
}