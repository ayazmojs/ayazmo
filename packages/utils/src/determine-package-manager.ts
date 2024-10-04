import checkCommandExists from './check-command-exists.js'

export default async function determinePackageManager (): Promise<{
  hasYarn: boolean
  hasNpm: boolean
}> {
  const [hasYarn, hasNpm] = await Promise.all([checkCommandExists('yarn'), checkCommandExists('npm')])

  return {
    hasYarn,
    hasNpm
  }
}
