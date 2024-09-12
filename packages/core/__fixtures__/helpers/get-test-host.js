export function getTestHost(fastifyInstance) {
  const address = fastifyInstance.server.address();
  return `http://${address.address}:${address.port}`;
}