import { AppConfig, AyazmoInstance } from '@ayazmo/types'
import { InMemoryEventEmitter } from '../emitter/InMemoryEventEmitter.js'
import { RedisEventEmitter } from '../emitter/RedisEventEmitter.js'
import { AyazmoCoreService } from '../interfaces/AyazmoCoreService.js'

type EventEmitterType = InMemoryEventEmitter | RedisEventEmitter

class EventService extends AyazmoCoreService {
  private readonly eventEmitter: EventEmitterType

  constructor (app: AyazmoInstance, config: AppConfig) {
    super(app, config)
    const configModule = this.getGlobalConfig()
    switch (configModule?.app?.emitter?.type) {
      case 'redis':
        this.eventEmitter = new RedisEventEmitter(app, configModule)
        break
      default: this.eventEmitter = new InMemoryEventEmitter(app, configModule)
    }
  }

  getEmitter (): EventEmitterType {
    return this.eventEmitter
  }

  subscribe (event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.subscribe(event, handler)
  }

  unsubscribe (event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.unsubscribe(event, handler)
  }

  async publish (event: string, data: any, pluginSettings: any): Promise<void> {
    await this.eventEmitter.publish(event, data, pluginSettings)
  }

  listSubscribers (event: string): any[] {
    return this.eventEmitter.listSubscribers(event)
  }
}

export default EventService
