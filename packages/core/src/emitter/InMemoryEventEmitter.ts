import { EventEmitter } from 'node:events'
import BaseEventEmitter from '../interfaces/BaseEventEmitter.js'

export class InMemoryEventEmitter extends BaseEventEmitter {
  private readonly emitter: EventEmitter

  constructor () {
    super()
    this.emitter = new EventEmitter()
  }

  override async publish (event: string, data: any, config: any): Promise<void> {
    console.log('InMemory: publishing event ', event)
    this.emitter.emit(event, data)
  }

  override subscribe (event: string, handler: (...args: any[]) => void): void {
    this.emitter.on(event, handler)
  }

  override unsubscribe (event: string, handler: (...args: any[]) => void): void {
    this.emitter.off(event, handler)
  }

  override getEmitter (): EventEmitter {
    return this.emitter
  }

  listSubscribers (event: string) {
    return this.getEmitter().listeners(event)
  }
}
