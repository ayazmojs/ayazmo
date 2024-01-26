import path from 'path';
import { AppConfig } from '@ayazmo/types';

async function importGlobalConfig(filePath?: string): Promise<AppConfig> {
  const configPath: string = filePath ?? path.join(process.cwd(), 'ayazmo.config.js');
  const resolvedPath = path.resolve(configPath);
  const module = await import(resolvedPath);
  return module.default;
}


export default importGlobalConfig;
