import { Queue, Worker, FlowProducer, FlowJob, Job } from 'bullmq';
import BaseEventEmitter from '../interfaces/BaseEventEmitter.js';
import { AppConfig, AyazmoInstance, AyazmoQueue, AyazmoWorker as AyazmoWorkerType, PluginSettings } from '@ayazmo/types';

const allQueueEvents = [
  'cleaned',
  'error',
  'paused',
  'progress',
  'removed',
  'resumed',
  'waiting'
]

const allWorkerEvents = [
  'active',
  'closing',
  'closed',
  'completed',
  'drained',
  'error',
  'failed',
  'paused',
  'progress',
  'ready',
  'resumed',
  'stalled'
]

export class AyazmoPublisher {
  private publisher: Queue;
  private flowProducer?: FlowProducer;
  public isFlow: boolean = false;
  private app: AyazmoInstance;
  private config: AppConfig;
  private eventPublishersMap = new Map<string, AyazmoQueue[]>();

  constructor(app: AyazmoInstance, config: AppConfig) {
    this.app = app;
    this.config = config;
    const queues: AyazmoQueue[] = this.config.app?.emitter?.queues ?? [];

    this.setEventPublishersMap(queues);

    if (queues.length > 1) {
      this.flowProducer = new FlowProducer({ connection: app.redis });
      this.isFlow = true;
    } else {
      this.publisher = this.createQueue(queues[0]?.name, queues[0]);
    }
  }

  setupEventHandlers(queue: Queue, config?: AyazmoQueue) {
    allQueueEvents.forEach((event) => {
      if (config?.events && config.events[event]) {
        // Use the configured event handler
        queue.on(event as any, config.events[event]);
      }
    });
  }

  createQueue(name: string = 'eventsQueue', queueConfig?: AyazmoQueue): Queue {
    const options = queueConfig?.options ?? {};
    const q = new Queue(name, {
      connection: this.app.redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
      ...options,
    });

    this.setupEventHandlers(q, queueConfig);

    return q;
  }

  setEventPublishersMap(publishers: AyazmoQueue[] = []) {
    publishers.forEach((publisher) => {
      if (Array.isArray(publisher.publishOn) && publisher.publishOn.length > 0) {
        publisher.publishOn.forEach((event) => {
          // Check if the event already has a publishers array, if not, initialize it
          const existingPublishers = this.eventPublishersMap.get(event) || [];
          // Add the new publisher to the array
          existingPublishers.push(publisher);
          // Set the updated array back to the map
          this.eventPublishersMap.set(event, existingPublishers);
        });
      }
    });
  }

  getEventPublishersMap(): Map<string, AyazmoQueue[]> {
    return this.eventPublishersMap;
  }

  getInstance(): Queue | FlowProducer {
    return this.publisher || this.flowProducer;
  }

  async publish(event: string, data: any | any[]): Promise<void> {
    if (!event || !data) {
      this.app.log.error('Event or data is missing, skip publishing.');
      return;
    }

    const publishers = this.eventPublishersMap.get(event);

    if (!publishers || publishers.length === 0) {
      this.app.log.info(`Event ${event} not allowed in the queues configuration for publishing`);
      return;
    }

    if (this.isFlow && this.flowProducer) {
      const jobPromises = publishers.map(async (publisher: AyazmoQueue) => {
        // Define default job options
        const defaultOpts = {
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
          }
        };

        const opts = {
          ...defaultOpts,
          ...(publisher.options ?? {}),
        };

        const transformedData = publisher.transformer ? await publisher.transformer(data, event, this.app) : data;

        return {
          name: event,
          queueName: publisher.name,
          data: transformedData,
          opts: opts,
        };
      });

      const jobs = await Promise.all(jobPromises);

      await this.flowProducer.addBulk(jobs as FlowJob[]);
    } else {
      await this.publisher.add(event, data);
    }
  }
}

export class AyazmoWorker {
  private workers: Map<string, Worker> = new Map();
  private app: AyazmoInstance;
  private config: AppConfig;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>>;

  constructor(app: AyazmoInstance, config: AppConfig, eventHandlers: Map<string, Set<(...args: any[]) => void>>) {
    this.app = app;
    this.config = config;
    this.eventHandlers = eventHandlers;

    this.spawnWorkers();
    this.setupGracefulShutdown();
    this.setupExceptionHandlers();
  }

  spawnWorkers() {
    const workerConfigs = this.config.app?.emitter?.workers ?? [];
    workerConfigs.forEach((workerConfig) => {
      const queueName = workerConfig.queueName;
      const worker = this.createWorker(queueName, async (job: Job) => {
        this.app.log.debug('Worker processing job: ' + job.name);
        this.app.log.debug(job.data);
        const handlers = this.eventHandlers.get(job.name);
        if (handlers) {
          for (const handler of handlers) {
            await handler(job);
          }
        } else {
          // throw to indicate this worker doesn't know how to handle this message.
          // Msg will be requeued. Check job attempts and backoff settings to know when msg will fail.
          throw new Error(`No handlers found for event: ${job.name}`);
        }
      }, workerConfig);

      this.workers.set(queueName, worker);
    });
  }

  setupEventHandlers(worker: Worker, config: AyazmoWorkerType) {
    allWorkerEvents.forEach((event) => {
      if (config.events && config.events[event]) {
        // Use the configured event handler
        worker.on(event as any, config.events[event]);
      }
    });
  }

  createWorker(
    queueName: string = 'eventsQueue',
    handler: any,
    workerConfig: AyazmoWorkerType
  ): Worker {
    const options = workerConfig?.options ?? {};

    const w = new Worker(queueName, handler, {
      // @ts-ignore
      connection: this.app.redis,
      ...options,
    });

    this.setupEventHandlers(w, workerConfig);

    return w;
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      this.app.log.info('Gracefully shutting down workers...');
      for (const worker of this.workers.values()) {
        await worker.close();
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  setupExceptionHandlers() {
    process.on('uncaughtException', (err) => {
      this.app.log.error(`Uncaught Exception: ${err.message}`);
      this.app.log.error(err.stack || '');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.app.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  getInstanceByQueueName(queueName: string): Worker | undefined {
    return this.workers.get(queueName);
  }

  getAllInstances(): Map<string, Worker> {
    return this.workers;
  }
}

export class RedisEventEmitter extends BaseEventEmitter {
  private publisher: AyazmoPublisher;
  private workers: AyazmoWorker;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();
  private config: AppConfig;

  constructor(app: AyazmoInstance, config: AppConfig) {
    super();
    this.config = config;
    this.publisher = new AyazmoPublisher(app, config);

    if (config.app?.emitter?.workers) {
      this.workers = new AyazmoWorker(app, config, this.eventHandlers);
    }
  }

  override async publish(event: string, data: any, pluginSettings?: PluginSettings): Promise<void> {
    // First try to get the callback from pluginSettings
    let onBeforePublish = pluginSettings?.onBeforePublish;
    
    // If not found in pluginSettings, fall back to global config
    if (typeof onBeforePublish !== 'function' && this.config.app?.onBeforePublish) {
      onBeforePublish = this.config.app.onBeforePublish;
    }

    // If we have a callback, execute it
    if (typeof onBeforePublish === 'function') {
      const result = await onBeforePublish(event, data);
      
      // Only publish if the callback returned something other than null/undefined
      if (result !== null && result !== undefined) {
        await this.publisher.publish(event, result);
      }
      return;
    }

    // If no callback was defined, publish the original data
    if (data !== null && data !== undefined) {
      await this.publisher.publish(event, data);
    }
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

  getWorkerByQueueName(queueName: string): Worker | undefined {
    return this.workers.getInstanceByQueueName(queueName);
  }

  getAllWorkers(): Map<string, Worker> {
    return this.workers.getAllInstances();
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