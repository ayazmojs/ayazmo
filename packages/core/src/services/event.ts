import { AppConfig, AyazmoContainer, AyazmoInstance } from '@ayazmo/types'
import BaseEventEmitter from '../interfaces/BaseEventEmitter.js'
import { InMemoryEventEmitter } from '../emitter/InMemoryEventEmitter.js'
import { RedisEventEmitter } from '../emitter/RedisEventEmitter.js'
import { AyazmoCoreService } from '../interfaces/AyazmoCoreService.js'

class EventService extends AyazmoCoreService {
  private readonly eventEmitter: BaseEventEmitter & {
    listSubscribers: (event: string) => any[]
  }

  constructor(container: AyazmoContainer, config: AppConfig, app: AyazmoInstance) {
    super(container, config, app)
    const configModule = this.getGlobalConfig()
    switch (configModule?.app?.emitter?.type) {
      case 'redis':
        this.eventEmitter = new RedisEventEmitter(container, configModule, app);
        break;
      // Add other cases for different event emitter types
      default: this.eventEmitter = new InMemoryEventEmitter()
    }
  }

  getEmitter(): BaseEventEmitter {
    return this.eventEmitter
  }

  subscribe(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.subscribe(event, handler)
  }

  unsubscribe(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.unsubscribe(event, handler)
  }

  async publish(event: string, data: any, config: any): Promise<void> {
    await this.eventEmitter.publish(event, data, config)
  }

  listSubscribers(event: string): any[] {
    return this.eventEmitter.listSubscribers(event)
  }
}

export default EventService
