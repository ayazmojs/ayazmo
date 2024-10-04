import { isAyazmoProject } from './is-ayazmo-project.js'
import CliLogger from './cli-logger.js'
import fs from 'node:fs'
import path from 'node:path'
import { isPluginInstalled, installPackageInMonorepo, GLOBAL_CONFIG_FILE_NAME, amendConfigFile } from '@ayazmo/utils'
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

  if (await isPluginInstalled(pluginName)) {
    CliLogger.error(`Plugin ${pluginName} is already installed.`)
    return
  }

  CliLogger.info(`Installing plugin ${pluginName}`)

  try {
    await installPackageInMonorepo(pluginName)
    const applicationConfigFilePath = path.join(process.cwd(), GLOBAL_CONFIG_FILE_NAME)
    const pluginPaths = getPluginPaths(pluginName, { private: false })
    const pluginConfigPath = path.join(pluginPaths.config ?? '')

    if (pluginConfigPath == null || !fs.existsSync(pluginConfigPath)) {
      throw new Error(`Plugin ${pluginName} does not have an application config file.`)
    }

    // add the plugin to the plugins array in the ayazmo.config.js file
    const configFileSource = await fs.promises.readFile(applicationConfigFilePath, 'utf8')
    const configFileUpdated = addPluginToConfig(configFileSource, pluginName)
    await writeFile(applicationConfigFilePath, configFileUpdated)

    // amend the config file
    if (applicationConfigFilePath != null && pluginConfigPath != null) {
      await amendConfigFile(applicationConfigFilePath, pluginConfigPath)
    }
  } catch (error) {
    CliLogger.error(`Failed to install plugin ${pluginName}:`)
    CliLogger.error(error)
    return
  }

  CliLogger.success(`Plugin ${pluginName} installed successfully.`)
}
