import path from 'node:path';

async function importGlobalConfig(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const module = await import(resolvedPath);
  return module.default;
}


export default importGlobalConfig;
