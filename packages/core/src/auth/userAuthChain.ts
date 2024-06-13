import { AyazmoError } from "@ayazmo/utils"
import { AyazmoInstance, FastifyRequest, FastifyReply, AppConfig } from "@ayazmo/types"

export default async function useAuthChain(app: AyazmoInstance, globalConfig?: AppConfig) {

  return (request: FastifyRequest, reply: FastifyReply, done: any) => {
    const enabledAuthProviders = globalConfig?.app?.enabledAuthProviders

    if (!Array.isArray(enabledAuthProviders) || enabledAuthProviders.length === 0) {
      app.log.warn(`No authentication providers configured! If you need to enable authentication please configure enabledAuthProviders in the config`)
      throw AyazmoError({
        statusCode: 401,
        message: 'Unauthenticated',
        code: 'UNAUTHENTICATED'
      });
    }

    // @ts-ignore
    const _auth = app.auth(enabledAuthProviders.map(p => Array.isArray(p) ? p.map(subP => app[subP]) : app[p]))
    // @ts-ignore
    _auth(request, reply, done)
  }
}