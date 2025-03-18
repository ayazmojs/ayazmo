import { isAyazmoProject } from './is-ayazmo-project.js'
import CliLogger from './cli-logger.js'
import fs from 'node:fs'
import path from 'node:path'
import { isPluginInstalled, installPackage, GLOBAL_CONFIG_FILE_NAME, amendConfigFile } from '@ayazmo/utils'
import { getPluginPaths } from '@ayazmo/core'
import { addPluginToConfig } from './code-transform-utils.js'

const writeFile = async (path: string, content: string): Promise<void> => {
  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(path)
    writeStream.on('error', reject)
    writeStream.on('finish', resolve)
    writeStream.write(content)
    writeStream.end()
  })
}

export const installPlugin = async (pluginName: string): Promise<void> => {
  if (!isAyazmoProject()) {
    CliLogger.error('You must be in an Ayazmo project directory to install a plugin.')
    return
  }

  const isInstalled: boolean = await isPluginInstalled(pluginName)

  if (isInstalled) {
    CliLogger.error(`Plugin ${pluginName} is already installed.`)
    return
  }

  CliLogger.info(`Installing plugin ${pluginName}`)

  try {
    await installPackage(pluginName)
    const applicationConfigFilePath = path.join(process.cwd(), GLOBAL_CONFIG_FILE_NAME)
    const pluginPaths = getPluginPaths({ name: pluginName, settings: { private: false } })
    const pluginConfigPath = path.join(pluginPaths.config ?? '')

    // Use default config template if plugin doesn't provide one
    const configPath = fs.existsSync(pluginConfigPath)
      ? pluginConfigPath
      : path.join(process.cwd(), 'node_modules', '@ayazmo', 'utils', 'dist', 'config.template.js')

    if (!fs.existsSync(configPath)) {
      throw new Error('Could not find plugin config template')
    }

    const configFileSource = await fs.promises.readFile(applicationConfigFilePath, 'utf8')
    const configFileUpdated = addPluginToConfig(configFileSource, pluginName)
    await writeFile(applicationConfigFilePath, configFileUpdated)

    await amendConfigFile(applicationConfigFilePath, configPath, pluginName)
  } catch (error) {
    CliLogger.error(`Failed to install plugin ${pluginName}:`)
    CliLogger.error(error)
    return
  }

  CliLogger.success(`Plugin ${pluginName} installed successfully.`)
}
