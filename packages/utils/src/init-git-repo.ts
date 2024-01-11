import { execa } from 'execa';

async function tryGitInit(directory: string, command: string): Promise<boolean> {
  try {
    await execa(command, ['init'], { cwd: directory, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

export default async function initializeGitRepo(directory: string): Promise<void> {
  const gitCommands = ['git', '/usr/bin/git'];
  for (const command of gitCommands) {
    const success = await tryGitInit(directory, command);
    if (success) {
      return;
    }
  }

  throw new Error('Failed to initialize Git repository. Ensure that Git is installed and in your PATH.');
}