import { isAyazmoProject } from './is-ayazmo-project.js'

export function validateAyazmoProject (): void {
  if (!isAyazmoProject(process.cwd())) {
    console.error('This command must be run in the root of an Ayazmo project.')
    process.exit(1)
  }
}
