import { alwaysFailAuth, sanitizeProvider, mapAuthProviders } from "@ayazmo/utils"
import { AyazmoInstance, AppConfig } from "@ayazmo/types"

export default function userAuthChain(app: AyazmoInstance, globalConfig?: AppConfig) {
  const rawEnabledAuthProviders = globalConfig?.app?.enabledAuthProviders ?? [];
  const enabledAuthProviders = rawEnabledAuthProviders.filter(sanitizeProvider);
  if (!Array.isArray(enabledAuthProviders) || enabledAuthProviders.length === 0) {
    app.log.warn(`No authentication providers configured! If you need to enable authentication please configure enabledAuthProviders in the config`);
    // @ts-ignore
    return app.auth([alwaysFailAuth]); // Return the fail-safe method directly
  }

  // @ts-ignore
  const mappedProviders = mapAuthProviders(app, enabledAuthProviders);
  // @ts-ignore
  return app.auth(mappedProviders);
}