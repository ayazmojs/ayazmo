import path from 'node:path'
import fs from 'fs/promises'
import { cloneRepository } from './download-from-github.js'
import { PLUGINS_ROOT } from '@ayazmo/utils'
import { askUserForPluginName, askUserForPackageManager } from './prompts.js'
import CliLogger from './cli-logger.js'
import PackagetJson from '@npmcli/package-json'
import { isAyazmoProject } from './is-ayazmo-project.js'
import { execa } from 'execa'

export async function createPlugin (): Promise<void> {
  CliLogger.info('Checking environment...')

  let pluginInstallPath: string = ''
  const answers = await askUserForPluginName()
  const pluginName = answers.name

  if (isAyazmoProject()) {
    pluginInstallPath = path.join(PLUGINS_ROOT, pluginName)
  } else {
    const currentDirName = path.basename(process.cwd())

    if (currentDirName === answers.name) {
      pluginInstallPath = process.cwd()
    } else {
      pluginInstallPath = path.join(process.cwd(), answers.name)

      try {
        await fs.access(pluginInstallPath)
      } catch {
        // Directory does not exist, so create it
        await fs.mkdir(pluginInstallPath, { recursive: true })
        CliLogger.info(`Directory ${pluginInstallPath} created.`)
      }
    }
  }

  CliLogger.info(`Creating a new plugin in ${pluginInstallPath}...`)

  try {
    // Specify the GitHub repository
    const repo = 'ayazmojs/ayazmo-plugin-template'

    // Download and extract the template
    await cloneRepository(repo, pluginInstallPath)
    const pkgJson = await PackagetJson.load(pluginInstallPath)
    pkgJson.update({
      name: pluginName,
      description: pluginName.replaceAll('-', ' '),
      keywords: [
        `${pluginName}`
      ]
    })
    await pkgJson.save()

    // Install dependencies
    const packageManager = await askUserForPackageManager()
    await execa(packageManager.manager, ['install'], { cwd: pluginInstallPath })

    CliLogger.success(`Plugin ${pluginName} created successfully in ${pluginInstallPath}. You may enable this plugin in ayazmo.config.js`)
  } catch (error) {
    CliLogger.error(error)
  }
}
