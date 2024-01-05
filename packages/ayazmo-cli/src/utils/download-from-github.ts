import tiged from 'tiged';

export async function cloneRepository(url: string, dest: string): Promise<void> {
  const emitter = tiged(url, {
    disableCache: true,
    force: true,
    verbose: true
  });

  // emitter.on('info', info => {
  //   console.log(info.message);
  // });

  await emitter.clone(dest);
}