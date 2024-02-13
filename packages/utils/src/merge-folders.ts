import fs from 'fs-extra';
import path from 'node:path';

interface MergeConfig {
  recursive?: boolean;
  override?: boolean;
  fileTypes?: string[];
}

/**
 * Merge folders from source to destination based on provided configuration.
 * @param {string} sourcePath - The path of the source folder.
 * @param {string} destinationPath - The path of the destination folder.
 * @param {Object} config - Configuration options.
 * @param {boolean} config.recursive - Whether to merge folders recursively.
 * @param {boolean} config.override - Whether to override existing files in the destination folder.
 * @returns {Promise<void>} - A promise indicating the success or failure of the merge operation.
 */
export async function mergeFolders(sourcePath: string, destinationPath: string, config: MergeConfig = {}): Promise<void> {
  try {
    // Ensure both source and destination directories exist
    if (!fs.existsSync(sourcePath)) {
      return;
    }
    if (!fs.existsSync(destinationPath)) {
      throw new Error(`Destination directory does not exist: ${destinationPath}`);
    }

    // Copy files and directories from source to destination based on config
    await copyFiles(sourcePath, destinationPath, config);

    console.log('Folder structure merged successfully!');
  } catch (error: any) {
    throw new Error(`Error merging folders: ${error.message}`);
  }
}

/**
 * Recursively copy files and directories from source to destination.
 * @param {string} source - Source directory path.
 * @param {string} destination - Destination directory path.
 * @param {Object} config - Configuration options.
 * @param {boolean} config.override - Whether to override existing files in the destination folder.
 * @returns {Promise<void>} - A promise indicating the success or failure of the copy operation.
 */
async function copyFiles(source: string, destination: string, config: MergeConfig): Promise<void> {
  const entries = await fs.readdir(source);

  for (const entry of entries) {
    const sourcePath = path.join(source, entry);
    const destinationPath = path.join(destination, entry);

    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      if (config.recursive) {
        await fs.ensureDir(destinationPath);
        await copyFiles(sourcePath, destinationPath, config);
      }
    } else {
      const fileExtension = path.extname(entry).toLowerCase().slice(1); // Get file extension without dot
      if (!config.fileTypes || config.fileTypes.includes(fileExtension)) {
        if (config.override || !fs.existsSync(destinationPath)) {
          await fs.copyFile(sourcePath, destinationPath);
        }
      }
    }
  }
}
