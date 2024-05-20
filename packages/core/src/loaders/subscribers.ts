import { AyazmoInstance, PluginSettings } from '@ayazmo/types'
import { AwilixContainer } from 'awilix'
import { globby } from 'globby'

export async function loadSubscribers(
  fastify: AyazmoInstance,
  diContainer: AwilixContainer,
  subscribersPath: string,
  pluginSettings: PluginSettings
): Promise<void> {
  const eventService = diContainer.resolve('eventService')

  if (pluginSettings.subscribers) {

    const subscribers = pluginSettings.subscribers ?? {}

    // Load all the subscribers from the configured path
    for (const [event, handler] of Object.entries(subscribers)) {
      if (typeof handler === 'function') {
        eventService.subscribe(event, handler)
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

      const { event, handler } = await module.default(diContainer, pluginSettings)
      eventService.subscribe(event, handler)

      fastify.log.info(` - Registered subscriber ${module.default.name} on ${event}`)
    } catch (error) {
      fastify.log.error(` - Error while loading module ${file}: ${error}`)
    }
  })

  await Promise.all(loadModulePromises)
}
