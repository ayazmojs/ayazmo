import BaseEventEmitter from "../interfaces/BaseEventEmitter.js";
import { InMemoryEventEmitter } from "../emitter/InMemoryEventEmitter.js";
import { AyazmoCoreService } from '../interfaces/ayazmo-core-service.js';

class EventService extends AyazmoCoreService {
  private eventEmitter: BaseEventEmitter & {
    listSubscribers: (event: string) => any[];
  };

  constructor(container, config) {
    super(container, config);
    const configModule = this.getGlobalConfig();
    switch (configModule?.eventEmitterType) {
      // case 'redis': this.eventEmitter = new RedisEventEmitter(config.redisConfig); break;
      // Add other cases for different event emitter types
      default: this.eventEmitter = new InMemoryEventEmitter();
    }
  }

  getEmitter(): BaseEventEmitter {
    return this.eventEmitter;
  }

  subscribe(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.subscribe(event, handler);
  }

  unsubscribe(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.unsubscribe(event, handler);
  }

  async publish(event: string, data: any): Promise<void> {
    await this.eventEmitter.publish(event, data);
  }

  listSubscribers(event: string): any[] {
    return this.eventEmitter.listSubscribers(event);
  }
}

export default EventService;