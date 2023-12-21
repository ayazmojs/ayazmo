import fs from 'fs';
import path from 'path';

export function listFilesInDirectory(directory: string): string[] {
  // Check if the directory exists
  if (!fs.existsSync(directory)) {
    return [];
  }

  // Get the directory contents
  const contents = fs.readdirSync(directory);

  // Check if the directory is empty
  if (contents.length === 0) {
    return [];
  }

  // Filter out non-file entries and return the filenames
  const files = contents.filter((file) =>
    fs.statSync(path.join(directory, file)).isFile()
  );

  return files;
}
