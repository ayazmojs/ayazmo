import { Queue, Worker } from 'bullmq';
import BaseEventEmitter from '../interfaces/BaseEventEmitter.js';

export class RedisEventEmitter extends BaseEventEmitter {
  private queue: Queue;
  private worker: Worker;
  // create a map to hold events and handlers
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(container: any, config: any, app: any) {
    super();
    this.queue = new Queue('eventsQueue', { connection: app.redis });
    this.worker = new Worker('eventsQueue', async (job) => {
      const handlers = this.eventHandlers.get(job.name);

      if (handlers) {
        for (const handler of handlers) {
          await handler(job.data, container);
        }
      }
    }, { connection: app.redis });
  }

  override async publish(event: string, data: any, config: any): Promise<void> {
    await this.queue.add(event, data, {
      removeOnComplete: 100,
      removeOnFail: 1000,
      ...config
    });
  }

  override async subscribe(event: string, handler: (...args: any[]) => void): Promise<void> {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(handler);
  }

  override async unsubscribe(event: string, handler: (...args: any[]) => void): Promise<void> {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      // If there are no more handlers for the event, remove the event from the map
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  override getEmitter(): any {
    return this.worker;
  }

  listSubscribers(event: string) {
    const subscribers = this.eventHandlers.get(event);
    if (subscribers) {
      return Array.from(subscribers);
    }
    return [];
  }
}