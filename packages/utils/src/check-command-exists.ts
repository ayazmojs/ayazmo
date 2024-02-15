import execa from 'execa';

export default async function checkCommandExists(command: string): Promise<boolean> {
  try {
    await execa(command, [`--version`]);
    return true;
  } catch (error) {
    return false;
  }
}