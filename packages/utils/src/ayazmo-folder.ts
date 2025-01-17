import fs from 'node:fs/promises'
import path from 'node:path'

export interface AyazmoFolderOptions {
  root?: string
  subfolders?: string[]
}

const DEFAULT_ROOT = '.ayazmo'

/**
 * Checks if the .ayazmo folder exists
 * @param root Optional custom root folder name (defaults to .ayazmo)
 * @returns Promise<boolean>
 */
export async function doesAyazmoFolderExist (root: string = DEFAULT_ROOT): Promise<boolean> {
  try {
    await fs.access(path.resolve(process.cwd(), root))
    return true
  } catch {
    return false
  }
}

/**
 * Creates the .ayazmo folder structure with optional subfolders
 * @param options Configuration options for folder creation
 * @returns Promise<string> The absolute path to the created root folder
 */
export async function createAyazmoFolders (options: AyazmoFolderOptions = {}): Promise<string> {
  const root = options.root ?? DEFAULT_ROOT
  const absoluteRoot = path.resolve(process.cwd(), root)

  try {
    // Only create root folder if it doesn't exist
    if (!(await doesAyazmoFolderExist(root))) {
      await fs.mkdir(absoluteRoot, { recursive: true })
    }

    // Create subfolders if specified
    const subfolders = options.subfolders ?? []
    if (subfolders.length > 0) {
      for (const subfolder of subfolders) {
        const folderPath = path.join(absoluteRoot, subfolder)
        await fs.mkdir(folderPath, { recursive: true })
      }
    }

    return absoluteRoot
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to create Ayazmo folder structure: ${error.message}`)
    }
    throw error
  }
}

/**
 * Ensures a specific subfolder exists in the .ayazmo directory
 * @param subfolder The subfolder path relative to .ayazmo root
 * @param root Optional custom root folder name (defaults to .ayazmo)
 * @returns Promise<string> The absolute path to the created subfolder
 */
export async function ensureAyazmoSubfolder (subfolder: string, root: string = DEFAULT_ROOT): Promise<string> {
  const absolutePath = path.resolve(process.cwd(), root, subfolder)

  try {
    await fs.mkdir(absolutePath, { recursive: true })
    return absolutePath
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to create subfolder ${subfolder}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Recursively removes the .ayazmo folder and all its contents
 * @param root Optional custom root folder name (defaults to .ayazmo)
 * @returns Promise<void>
 */
export async function cleanupAyazmoFolder (root: string = DEFAULT_ROOT): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), root)

  try {
    if (await doesAyazmoFolderExist(root)) {
      await fs.rm(absolutePath, { recursive: true, force: true })
    }
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Failed to cleanup ${root} folder: ${error.message}`)
    }
  }
}
