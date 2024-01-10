import path from 'path';
import { AppConfig } from './interfaces';

async function importGlobalConfig(filePath: string): Promise<AppConfig> {
  const resolvedPath = path.resolve(filePath);
  const module = await import(resolvedPath);
  return module.default;
}


export default importGlobalConfig;
