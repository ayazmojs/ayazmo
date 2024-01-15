import { EventEmitter } from 'node:events';
import { IEventEmitter } from '@ayazmo/types';

export default abstract class BaseEventEmitter implements IEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  async publish(event: string, data: any): Promise<void> {
    this.emitter.emit(event, data);
  }

  subscribe(event: string, handler: (...args: any[]) => void): void {
    this.emitter.on(event, handler);
  }

  unsubscribe(event: string, handler: (...args: any[]) => void): void {
    this.emitter.off(event, handler);
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }
}