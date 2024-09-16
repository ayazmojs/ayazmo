import { AyazmoInstance } from '@ayazmo/types'
import { asFunction } from 'awilix'
import path from 'node:path'
import { globby } from 'globby'
import { fileURLToPath } from 'url'

export async function loadCoreServices(
  app: AyazmoInstance
): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const servicesPath = path.join(__dirname, '..', '..', '..', 'dist', 'services')
  const serviceFiles = await globby(`${servicesPath}/*.js`)

  if (serviceFiles.length === 0) {
    app.log.info(` - No services discovered in ${servicesPath}`)
    return
  }

  const loadServiceFile = async (file: string) => {
    try {
      // load the service file
      const serviceModule = await import(file)

      // Check if the default export exists
      if (!serviceModule.default || typeof serviceModule.default !== 'function') {
        app.log.error(` - The module ${file} does not have a valid default export.`)
        return
      }

      const serviceName = path.basename(file).replace(/\.(ts|js)$/, '') + 'Service'

      // Register the service in the DI container
      app.diContainer.register({
        [serviceName]: asFunction(
          (cradle) => new serviceModule.default(cradle, {}, app)
        ).singleton()
      })

      app.log.info(` - Registered service ${serviceName}`)
    } catch (error) {
      app.log.error(` - Error while loading service ${file}: ${error}`)
    }
  }

  await Promise.all(serviceFiles.map(loadServiceFile))
}
