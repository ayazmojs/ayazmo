import path from 'node:path'
import fs from 'node:fs'
import { readdir } from 'node:fs/promises'
import { determinePackageManager, runInstall, initializeGitRepo, APP_TEMPLATE_REPO_NAME } from '@ayazmo/utils'
import { cloneRepository } from './download-from-github.js'
import { askUserForPackageManager, askUserWhereToCreateApp, askUserToCreateGitRepo } from './prompts.js'
import CliLogger from './cli-logger.js'

export async function createApplication (): Promise<void> {
  CliLogger.info('Creating a new Ayazmo application...')

  let manager: 'npm' | 'yarn'

  try {
    const { hasYarn, hasNpm } = await determinePackageManager()

    if (!hasYarn && !hasNpm) {
      throw new Error('No package manager found. Please install npm or yarn and try again.')
    }

    if (hasYarn && hasNpm) {
      const answer = await askUserForPackageManager()
      manager = answer.manager
    } else {
      manager = hasYarn ? 'yarn' : 'npm'
    }

    const { directory } = await askUserWhereToCreateApp()

    // Initialize Git repository
    const { gitInit = false } = await askUserToCreateGitRepo()

    const appInstallationPath = path.resolve(process.cwd(), directory)
    const installationPathExists = fs.existsSync(appInstallationPath)

    if (installationPathExists) {
      const files = await readdir(appInstallationPath)

      if (files.length > 0) {
        throw new Error(`${appInstallationPath} already exists and is not empty!`)
      }
    }

    // Create directory if it doesn't exist
    if (directory !== '.' && !installationPathExists) {
      fs.mkdirSync(appInstallationPath, { recursive: true })
    }

    CliLogger.info(`Creating a new Ayazmo application in ${appInstallationPath}...`)

    // Download and extract the template
    await cloneRepository(APP_TEMPLATE_REPO_NAME, appInstallationPath)
    CliLogger.success('Application files created.')

    await runInstall(manager, appInstallationPath)
    CliLogger.success('Dependencies installed.')

    if (gitInit) {
      await initializeGitRepo(appInstallationPath)
      CliLogger.success('Initialized a new Git repository.')
    }

    CliLogger.info(`Ayazmo application successfully created in ${appInstallationPath}`)
  } catch (error) {
    CliLogger.error(error)
    process.exit(1)
  }
}
