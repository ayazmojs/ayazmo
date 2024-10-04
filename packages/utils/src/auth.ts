import AyazmoError from './ayazmo-error.js'
import { FastifyRequest, FastifyReply, AyazmoInstance } from '@ayazmo/types'

export function alwaysFailAuth (request: FastifyRequest, reply: FastifyReply, done: any): void {
  done(AyazmoError({
    statusCode: 401,
    message: 'Unauthenticated',
    code: 'UNAUTHENTICATED'
  }))
}

export function sanitizeProvider (provider: string | string[]): boolean {
  return typeof provider === 'string' ||
    (Array.isArray(provider) && provider.every(p => typeof p === 'string'))
}

export function getAuthProviderFunction (app: AyazmoInstance, providerName: string): (() => any) | null {
  if (app.hasDecorator(providerName) != null) {
    return app[providerName]
  } else {
    app.log.error(`Authentication provider '${providerName}' is not registered.`)
    return null // Return null to indicate an invalid provider
  }
}

export function mapAuthProviders (app: AyazmoInstance, providers: Array<string | string[]>): any[] {
  const authFunctions = providers.reduce((acc: any[], provider: string | string[]) => {
    if (typeof provider === 'string') {
      const authFunction = getAuthProviderFunction(app, provider)
      if (authFunction != null) { // Check for a non-null auth function
        acc.push(authFunction)
      }
    } else if (Array.isArray(provider)) {
      const nestedAuthFunctions = provider
        .map(p => getAuthProviderFunction(app, p))
        .filter(fn => fn !== null) // Filter out null values
      acc.push(...nestedAuthFunctions)
    }
    return acc
  }, [])

  return authFunctions.length > 0 ? authFunctions : [alwaysFailAuth]
}
