import { Queue, Worker, FlowProducer, QueueOptions, FlowJob } from 'bullmq';
import BaseEventEmitter from '../interfaces/BaseEventEmitter.js';
import { AppConfig, AyazmoContainer, AyazmoInstance } from '@ayazmo/types';

export class AyazmoPublisher {
  private publisher: Queue;
  private flowProducer?: FlowProducer;
  public isFlow: boolean = false;
  private app: AyazmoInstance;
  private config: AppConfig;

  constructor(config: AppConfig, app: AyazmoInstance) {
    this.app = app;
    this.config = config;
    const queues: any[] = this.config.app?.emitter?.queues ?? [];

    if (queues.length > 1) {
      // configure multiple queues
      this.flowProducer = new FlowProducer({ connection: app.redis });
      this.isFlow = true;
    } else {
      this.publisher = new Queue(queues[0]?.name ?? 'eventsQueue', {
        connection: app.redis,
        defaultJobOptions: {
          removeOnComplete: false,
          removeOnFail: false,
        },
        ...queues[0]?.options,
      });

      this.publisher.on('removed', (job) => {
        app.log.debug(`Job removed with result ${job.name}`);
      });

      this.publisher.on('error', (err) => {
        app.log.error(`Job failed: ${err.message}`);
      });
    }
  }

  getPublisher(): Queue | FlowProducer {
    return this.publisher || this.flowProducer;
  }

  async publish(event: string, data: any): Promise<void> {
    if (!event || !data) {
      this.app.log.error('Event or data is missing, cannot publish.');
      return;
    }

    if (this.isFlow && this.flowProducer) {
      const queues = this.config.app?.emitter?.queues ?? [];
      const jobs = queues.map((queueOptions: { name: string, options?: QueueOptions }) => {
        // Define default job options
        const defaultOpts = {
          defaultJobOptions: {
            removeOnComplete: false,
            removeOnFail: false,
          }
        };

        const opts = {
          ...defaultOpts, // Set default opts
          ...(queueOptions.options ?? {}), // Override with custom defaultJobOptions if provided
        };

        return {
          name: event,
          queueName: queueOptions.name,
          data: data,
          opts: opts,
        };
      });

      await this.flowProducer.addBulk(jobs as FlowJob[]);
    } else {
      await this.publisher.add(event, data, {
        removeOnComplete: false,
        removeOnFail: false,
        ...this.config
      });
    }
  }
}

export class AyazmoWorker {
  private worker: Worker;
  private app: AyazmoInstance;
  private config: AppConfig;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>>;

  constructor(config: AppConfig, app: AyazmoInstance, eventHandlers: Map<string, Set<(...args: any[]) => void>>) {
    this.app = app;
    this.config = config;
    this.eventHandlers = eventHandlers;
    const queueName = this.config.app?.emitter?.worker.queueName ?? 'eventsQueue';

    this.worker = new Worker(queueName, async (job) => {
      this.app.log.debug('Worker processing job: ' + job.name);
      this.app.log.debug(job.data)
      const handlers = this.eventHandlers.get(job.name);
      if (handlers) {
        for (const handler of handlers) {
          await handler(job.data);
        }
      }
    }, {
      ...this.config.app?.emitter?.worker.options, // Spread worker options first
      connection: this.config.app?.emitter?.worker.options?.connection || app.redis, // Use app.redis as fallback
    });

    // Worker event listeners
    this.worker.on('completed', (job) => {
      this.app.log.debug(`Worker completed job ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.app.log.error(`Worker job ${job ? job.id : 'undefined'} failed: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      this.app.log.error(`Worker error: ${err.message}`);
    });
  }

  getWorker(): Worker {
    return this.worker;
  }
}

export class RedisEventEmitter extends BaseEventEmitter {
  private publisher: AyazmoPublisher;
  private worker: AyazmoWorker;
  // create a map to hold events and handlers
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(container: AyazmoContainer, config: AppConfig, app: AyazmoInstance) {
    super();
    this.publisher = new AyazmoPublisher(config, app);

    if (config.app?.emitter?.worker) {
      app.log.info('Initializing worker --------')
      this.worker = new AyazmoWorker(config, app, this.eventHandlers);
    }
  }

  override async publish(event: string, data: any): Promise<void> {
    await this.publisher.publish(event, data);
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