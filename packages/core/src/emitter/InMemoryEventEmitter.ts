import BaseEventEmitter from '../interfaces/BaseEventEmitter.js';

export class InMemoryEventEmitter extends BaseEventEmitter {
  constructor() {
    super();
  }

  listSubscribers(event: string) {
    return this.getEmitter().listeners(event);
  }
}