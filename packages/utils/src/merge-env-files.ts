import { promises as fs } from 'node:fs'
import dotenv from 'dotenv'

interface EnvObject {
  [key: string]: string
}

/**
 * Reads and parses .evn file
 * @param filePath path to .env file
 * @returns EnvObject
 */
const readEnvFile = async (filePath: string): Promise<EnvObject> => {
  try {
    const content: string = await fs.readFile(filePath, 'utf8')
    return dotenv.parse(content)
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return {}
  }
}

/**
 * Function to merge two objects
 * @param primaryObj
 * @param secondaryObj
 * @returns
 */
const mergeEnvObjects = (primaryObj: EnvObject, secondaryObj: EnvObject): EnvObject => {
  return { ...secondaryObj, ...primaryObj }
}

// Function to merge .env files with priority
const mergeEnvFiles = async (ayazmoEnvPath: string, pluginEnvPath: string): Promise<void> => {
  try {
    const [permanentEnvContent, temporaryEnvContent] = await Promise.all([
      readEnvFile(ayazmoEnvPath),
      readEnvFile(pluginEnvPath)
    ])

    // Merge the env objects
    const mergedEnv: EnvObject = mergeEnvObjects(permanentEnvContent, temporaryEnvContent)
    const mergedEnvString: string = Object.keys(mergedEnv).map((key) => `${key}=${mergedEnv[key]}`).join('\n')

    // Write the merged content back
    await fs.writeFile(ayazmoEnvPath, mergedEnvString, 'utf8')
    console.log('Merged .env files successfully.')
  } catch (error) {
    console.error('Failed to merge .env files:', error)
  }
}

export { mergeEnvFiles, readEnvFile, mergeEnvObjects }
