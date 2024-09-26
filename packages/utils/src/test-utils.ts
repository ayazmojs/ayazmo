import { AyazmoInstance } from "@ayazmo/types";

export function getTestHost(fastifyInstance: AyazmoInstance): string {
    const address = fastifyInstance.server.address();
    // @ts-ignore
    return `http://${address.address}:${address.port}`;
  }