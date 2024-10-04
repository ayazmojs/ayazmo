import { execa } from 'execa'

export default async function runInstall (command: string, directory: string): Promise<void> {
  await execa(command, ['install'], { cwd: directory, stdio: 'inherit' })
}
