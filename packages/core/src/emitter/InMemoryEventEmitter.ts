import { EventEmitter } from 'node:events'
import { AppConfig, AyazmoInstance, PluginSettings } from '@ayazmo/types'
import BaseEventEmitter from '../interfaces/BaseEventEmitter.js'

export class InMemoryEventEmitter extends BaseEventEmitter {
  private readonly emitter: EventEmitter
  private config: AppConfig;

  constructor(app: AyazmoInstance, config: AppConfig) {
    super()
    this.emitter = new EventEmitter()
    this.config = config
  }

  override async publish(event: string, data: any, pluginSettings?: PluginSettings): Promise<void> {
    let onBeforePublish = pluginSettings?.onBeforePublish;
    
    if (typeof onBeforePublish !== 'function' && this.config.app?.onBeforePublish) {
      onBeforePublish = this.config.app.onBeforePublish;
    }

    if (typeof onBeforePublish === 'function') {
      const result = await onBeforePublish(event, data);
      
      if (result !== null && result !== undefined) {
        this.emitter.emit(event, result);
      }
      return;
    }

    if (data !== null && data !== undefined) {
      this.emitter.emit(event, data);
    }
  }

  override subscribe(event: string, handler: (...args: any[]) => void): void {
    this.emitter.on(event, handler)
  }

  override unsubscribe(event: string, handler: (...args: any[]) => void): void {
    this.emitter.off(event, handler)
  }

  override getEmitter(): EventEmitter {
    return this.emitter
  }

  getWorker(): EventEmitter {
    return this.emitter
  }

  listSubscribers(event: string) {
    return this.getEmitter().listeners(event)
  }
}
