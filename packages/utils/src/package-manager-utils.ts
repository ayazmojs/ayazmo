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
 * Wrapper around yarn/npm add command
 * @param packageName
 */
export const installPackage = async (packageName: string): Promise<void> => {
  const packageManager = await getPackageManager()
  const command = packageManager === 'yarn' ? 'add' : 'install'
  const { stderr } = await execa(packageManager, [command, packageName], { cwd: process.cwd(), stdio: 'inherit' })
  if (stderr !== '') {
    throw new Error(`Failed to install package ${packageName}: ${String(stderr)}`)
  }
}

/**
 * Wrapper around yarn/npm remove command
 * @param packageName
 */
export const removePackage = async (packageName: string): Promise<void> => {
  const packageManager = await getPackageManager()
  const command = packageManager === 'yarn' ? 'remove' : 'uninstall'
  const { stderr } = await execa(packageManager, [command, packageName], { cwd: process.cwd(), stdio: 'inherit' })
  if (stderr !== '') {
    throw new Error(`Failed to remove package ${packageName}: ${String(stderr)}`)
  }
}

/**
 * Installs a package in the root of a monorepo
 * @param packageName The name of the package to install
 */
export const installPackageInMonorepo = async (packageName: string): Promise<void> => {
  const packageManager = await getPackageManager()
  let commandArgs: string[]

  if (packageManager === 'yarn') {
    commandArgs = ['add', packageName, '-W']
  } else { // npm
    commandArgs = ['install', packageName]
  }

  const { stderr } = await execa(packageManager, commandArgs, { cwd: process.cwd(), stdio: 'inherit' })

  if (stderr !== '') {
    throw new Error(`Failed to install package ${packageName} at the root of the monorepo: ${String(stderr)}`)
  }
}
