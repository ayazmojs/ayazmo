import { AyazmoInstance, PluginSettings } from '@ayazmo/types'
import { globby } from 'globby'
import EventService from '../services/event.js'

export async function loadSubscribers(
  fastify: AyazmoInstance,
  subscribersPath: string,
  pluginSettings: PluginSettings
): Promise<void> {
  const eventService = fastify.diContainer.resolve('eventService') as EventService

  if (pluginSettings?.subscribers) {

    const subscribers = pluginSettings.subscribers ?? {}

    // Load all the subscribers from the configured path
    for (const [event, handler] of Object.entries(subscribers)) {
      if (typeof handler === 'function') {
        eventService.subscribe(event, handler as (...args: any[]) => void)
        fastify.log.info(` - Registered ${pluginSettings.name} subscriber on ${event}`)
      }
    }
  }

  const subscribersFiles = await globby(`${subscribersPath}/*.js`)

  if (subscribersFiles.length === 0) {
    fastify.log.info(` - No subscribers discovered in ${subscribersPath}`)
    return
  }

  const loadModulePromises = subscribersFiles.map(async (file) => {
    try {
      // load the module file
      const module = await import(file)

      // Check if the default export exists
      if (!module.default || typeof module.default !== 'function') {
        fastify.log.error(` - The module ${file} does not have a valid default export.`)
        return
      }

      const subscriber = await module.default(fastify, pluginSettings)
      if (typeof subscriber.event === 'string' && typeof subscriber.handler === 'function') {
        eventService.subscribe(subscriber.event, subscriber.handler)
        fastify.log.info(` - Registered subscriber ${module.default.name} on ${subscriber.event}`)
      } else {
        fastify.log.warn(` - Invalid event or handler in ${file}. Event must be a string and handler must be a function.`)
      }

      fastify.log.info(` - Registered subscriber ${module.default.name} on ${event}`)
    } catch (error) {
      fastify.log.error(` - Error while loading module ${file}: ${error}`)
    }
  })

  await Promise.all(loadModulePromises)
}
