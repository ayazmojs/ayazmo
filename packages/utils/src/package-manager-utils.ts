import fs from 'node:fs'
import path from 'node:path'
import { execa } from 'execa'

/**
 * Checks if a given ayazmo plugin is installed in the current project
 * @param pluginName
 * @returns Boolean indicating if the plugin is installed
 */
export const isPluginInstalled = async (pluginName: string): Promise<boolean> => {
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  return packageJson.dependencies?.[pluginName] !== undefined
}

/**
 * Checks if a given package manager is installed by checking for the existence of a yarn.lock file
 * @returns "yarn" or "npm"
 */
export const getPackageManager = async (): Promise<string> => {
  const lockFilePath = path.join(process.cwd(), 'yarn.lock')
  try {
    await fs.promises.access(lockFilePath)
    return 'yarn'
  } catch {
    return 'npm'
  }
}

/**
 * Checks if the current project is a monorepo by looking for a workspaces field in package.json
 * @returns Boolean indicating if the current project is a monorepo
 */
const isMonorepo = async (): Promise<boolean> => {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'))
    return Boolean(packageJson.workspaces)
  } catch {
    return false
  }
}

/**
 * Installs a package using the detected package manager (yarn/npm)
 * Automatically detects if running in a monorepo and adjusts the installation command accordingly
 *
 * @param packageName - The name of the package to install
 * @throws Error if the installation fails
 */
export const installPackage = async (packageName: string): Promise<void> => {
  const packageManager = await getPackageManager()
  const monorepo = await isMonorepo()

  let commandArgs: string[]

  if (packageManager === 'yarn') {
    commandArgs = ['add', packageName]
    if (monorepo) {
      commandArgs.push('-W')
    }
  } else { // npm
    commandArgs = ['install', packageName]
  }

  try {
    const { stderr } = await execa(packageManager, commandArgs, {
      cwd: process.cwd()
    })

    if (stderr !== null && stderr !== '') {
      throw new Error(`Failed to install package ${packageName}: ${String(stderr)}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to install package ${packageName}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Wrapper around yarn/npm remove command
 * @param packageName
 */
export const removePackage = async (packageName: string): Promise<void> => {
  const packageManager = await getPackageManager()
  const command = packageManager === 'yarn' ? 'remove' : 'uninstall'
  const { stderr } = await execa(packageManager, [command, packageName], { cwd: process.cwd() })
  if (stderr !== null && stderr !== '') {
    throw new Error(`Failed to remove package ${packageName}: ${String(stderr)}`)
  }
}
