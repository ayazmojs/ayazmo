import { Queue, Worker, FlowProducer, QueueOptions, FlowJob } from 'bullmq';
import BaseEventEmitter from '../interfaces/BaseEventEmitter.js';
import { AppConfig, AyazmoContainer, AyazmoInstance, AyazmoQueue } from '@ayazmo/types';

export class AyazmoPublisher {
  private publisher: Queue;
  private flowProducer?: FlowProducer;
  public isFlow: boolean = false;
  private app: AyazmoInstance;
  private config: AppConfig;
  private eventQueueMap = new Map<string, AyazmoQueue[]>();

  constructor(app: AyazmoInstance, config: AppConfig) {
    this.app = app;
    this.config = config;
    const queues: AyazmoQueue[] = this.config.app?.emitter?.queues ?? [];

    this.setEventQueueMap(queues);

    if (queues.length > 1) {
      // configure multiple queues
      this.flowProducer = new FlowProducer({ connection: app.redis });
      this.isFlow = true;
    } else {
      this.publisher = this.createQueue(queues[0]?.name, queues[0]?.options);
    }
  }

  createQueue(name: string = 'eventsQueue', opts?: QueueOptions): Queue {
    const options = opts ?? {};
    const q = new Queue(name, {
      connection: this.app.redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
      ...options,
    });

    q.on('removed', (job) => {
      this.app.log.debug(`Job removed with result ${job.name}`);
    });

    q.on('error', (err) => {
      this.app.log.error(`Job failed: ${err.message}`);
    });

    q.on('progress', (job) => {
      console.log(`Job progress: ${job.name}`);
    });

    return q;
  }

  setEventQueueMap(queues: AyazmoQueue[] = []) {
    queues.forEach((queue) => {
      if (Array.isArray(queue.publishOn) && queue.publishOn.length > 0) {
        queue.publishOn.forEach((event) => {
          // Check if the event already has a queue array, if not, initialize it
          const existingQueues = this.eventQueueMap.get(event) || [];
          // Add the new queue to the array
          existingQueues.push(queue);
          // Set the updated array back to the map
          this.eventQueueMap.set(event, existingQueues);
        });
      }
    });
  }

  getEventQueueMap(): Map<string, AyazmoQueue[]> {
    return this.eventQueueMap;
  }

  getInstance(): Queue | FlowProducer {
    return this.publisher || this.flowProducer;
  }

  async publish(event: string, data: any | any[]): Promise<void> {
    if (!event || !data) {
      this.app.log.error('Event or data is missing, cannot publish.');
      return;
    }

    if (this.isFlow && this.flowProducer) {

      const queueOptions = this.eventQueueMap.get(event);

      if (!queueOptions) {
        this.app.log.info(`Event ${event} not found in the queues configuration`);
        return;
      }

      const jobs = queueOptions.map((queueOptions: AyazmoQueue) => {
        // Define default job options
        const defaultOpts = {
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
          }
        };

        const opts = {
          ...defaultOpts,
          ...(queueOptions.options ?? {}), // Override with custom defaultJobOptions if provided
        };

        const transformedData = queueOptions.transformer ? queueOptions.transformer(data, event, this.app) : data;

        return {
          name: event,
          queueName: queueOptions.name,
          data: transformedData,
          opts: opts,
        };
      });

      await this.flowProducer.addBulk(jobs as FlowJob[]);
    } else {
      await this.publisher.add(event, data);
    }
  }
}

export class AyazmoWorker {
  private worker: Worker;
  private app: AyazmoInstance;
  private config: AppConfig;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>>;

  constructor(app: AyazmoInstance, config: AppConfig, eventHandlers: Map<string, Set<(...args: any[]) => void>>) {
    this.app = app;
    this.config = config;
    this.eventHandlers = eventHandlers;
    const queueName = this.config.app?.emitter?.worker.queueName ?? 'eventsQueue';

    // this.worker = new Worker(queueName, async (job) => {
    //   this.app.log.debug('Worker processing job: ' + job.name);
    //   this.app.log.debug(job.data)
    //   const handlers = this.eventHandlers.get(job.name);
    //   if (handlers) {
    //     for (const handler of handlers) {
    //       await handler(job.data);
    //     }
    //   }
    // }, {
    //   ...this.config.app?.emitter?.worker.options, // Spread worker options first
    //   connection: this.config.app?.emitter?.worker.options?.connection || app.redis, // Use app.redis as fallback
    // });

    this.worker = this.createWorker(queueName, async (job) => {
      this.app.log.debug('Worker processing job: ' + job.name);
      this.app.log.debug(job.data)
      const handlers = this.eventHandlers.get(job.name);
      if (handlers) {
        for (const handler of handlers) {
          await handler(job.data);
        }
      }
    },
    {
      ...this.config.app?.emitter?.worker.options, // Spread worker options first
      // @ts-ignore
      connection: this.config.app?.emitter?.worker.options?.connection || app.redis, // Use app.redis as fallback
    })
  }

  createWorker(
    queueName: string = 'eventsQueue',
    handler: any,
    opts?: WorkerOptions
  ): Worker {
    const options = opts ?? {};
    const w = new Worker(queueName, handler, {
      connection: this.app.redis,
      ...options,
    });

    // Worker event listeners
    w.on('active', (job, prev) => {
      this.app.log.debug(`Worker active job ${job.id}`);
      console.log(`Worker active job ${job.id}`);
    });

    w.on('closing', () => {
      this.app.log.debug(`Worker is closing`);
      console.log(`Worker is closing`);
    });

    w.on('closed', () => {
      this.app.log.debug(`Worker is closed`);
      console.log(`Worker is closed`);
    });

    w.on('progress', (job, progress) => {
      this.app.log.debug(`Worker is in progress ${job.id}`);
      console.log(`Worker is in progress ${job.id}`);
    });

    w.on('ready', () => {
      this.app.log.debug(`Worker is in ready status`);
      console.log(`Worker is in ready status`);
    });

    w.on('paused', () => {
      this.app.log.debug(`Worker is paused`);
      console.log(`Worker is paused`);
    });

    w.on('drained', () => {
      this.app.log.debug(`Worker is drained`);
      console.log(`Worker is drained`);
    });

    w.on('resumed', () => {
      this.app.log.debug(`Worker is resumed`);
      console.log(`Worker is resumed`);
    });

    w.on('stalled', (jobId, prev) => {
      this.app.log.debug(`Worker job ${jobId} is stalled`);
      console.log(`Worker job ${jobId} is stalled`);
    });

    w.on('completed', (job) => {
      this.app.log.debug(`Worker completed job ${job.id}`);
      console.log(`Worker completed job ${job.id}`);
    });

    w.on('failed', (job, err) => {
      this.app.log.error(`Worker job ${job ? job.id : 'undefined'} failed: ${err.message}`);
      console.log(`Worker job ${job ? job.id : 'undefined'} failed: ${err.message}`);
    });

    w.on('error', (err) => {
      this.app.log.error(`Worker error: ${err.message}`);
      console.log(`Worker error: ${err.message}`);
    });

    return w;
  }

  getInstance(): Worker {
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
    this.publisher = new AyazmoPublisher(app, config);

    if (config.app?.emitter?.worker) {
      this.worker = new AyazmoWorker(app, config, this.eventHandlers);
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

  getPublisher(): AyazmoPublisher {
    return this.publisher;
  }

  getQueueOrFlow(): Queue | FlowProducer {
    return this.publisher.getInstance();
  }

  override getWorker(): Worker {
    return this.worker.getInstance();
  }

  getEventHandlers(): Map<string, Set<(...args: any[]) => void>> {
    return this.eventHandlers;
  }

  listSubscribers(event: string) {
    const subscribers = this.eventHandlers.get(event);
    if (subscribers) {
      return Array.from(subscribers);
    }
    return [];
  }
}