// import { AyazmoError } from "@ayazmo/utils"
import { AyazmoInstance, FastifyRequest, FastifyReply, AppConfig } from "@ayazmo/types"
import { AyazmoError } from "@ayazmo/utils"

export default function adminAuthChain(app: AyazmoInstance, globalConfig?: AppConfig) {
  const enabledAuthProviders = globalConfig?.admin?.enabledAuthProviders ?? []

  return (request: FastifyRequest, reply: FastifyReply, done: any) => {
    const isCustomRoute: boolean = !!globalConfig?.admin?.routes[request.url]

    if (isCustomRoute) {
      const authRules = globalConfig?.admin?.routes[request.url]
      
      if (authRules && authRules.length > 0) {
        // perform auth based on custom config
        const appAuthRules = authRules.map(p => Array.isArray(p) ? p.map(subP => app[subP]) : app[p])
        // @ts-ignore
        const _auth = app.auth(appAuthRules)
        // @ts-ignore
        return _auth(request, reply, done)
      } else {
        app.log.warn(`No admin authentication rules configured for route ${request.url}`)
      }

      if (enabledAuthProviders.length > 0) {
        // @ts-ignore
        const _auth = app.auth(enabledAuthProviders.map(p => Array.isArray(p) ? p.map(subP => app[subP]) : app[p]))
        // @ts-ignore
        return _auth(request, reply, done)
      } else {
        app.log.warn(`No admin authentication rules configured for route ${request.url} in enabledAuthProviders`)
      }
    }

    done(AyazmoError({
      statusCode: 403,
      message: "Unauthorized",
      code: "UNAUTHORIZED"
    }))
  }
}