import * as https from 'https';
// import * as fs from 'fs';
import * as unzipper from 'unzipper';
import path from 'node:path';

export function downloadAndUnzip(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(unzipper.Extract({ path: outputPath })).on('close', resolve);
      } else {
        reject(new Error(`Request Failed. Status Code: ${response.statusCode}`));
      }
    }).on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });
  });
}

export function createApplication() {
  console.log('Creating a new Ayazmo application...');

  const templateURL = 'https://github.com/yourusername/ayazmo-template/archive/refs/heads/main.zip';
  const outputPath = path.join(process.cwd(), 'ayazmo-app');

  downloadAndUnzip(templateURL, outputPath)
    .then(() => console.log('Application created successfully!'))
    .catch((error) => console.error('Failed to create application:', error.message));
}
