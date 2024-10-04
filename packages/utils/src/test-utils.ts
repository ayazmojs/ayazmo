import { AyazmoInstance } from '@ayazmo/types'

interface AddressInfo {
  address: string
  port: number
}

export function getTestHost (fastifyInstance: AyazmoInstance): string {
  const address = fastifyInstance.server.address()
  if (typeof address === 'string') {
    return address
  }
  if (address !== null && typeof address === 'object' && 'address' in address && 'port' in address) {
    const addressInfo = address as AddressInfo
    return `http://${addressInfo.address}:${addressInfo.port}`
  }
  throw new Error('Unable to determine server address')
}
