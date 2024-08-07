import { AyazmoInstance, AppConfig } from "@ayazmo/types"
import { alwaysFailAuth, sanitizeProvider, mapAuthProviders } from "@ayazmo/utils"

export default function adminAuthChain(app: AyazmoInstance, globalConfig?: AppConfig) {
  const enabledAuthProviders = globalConfig?.admin?.enabledAuthProviders ?? [];

  const filteredAuthProviders = enabledAuthProviders.filter(provider => {
    if (!provider.startsWith('admin')) {
      app.log.warn(`Invalid admin authentication provider "${provider}" excluded. Admin authentication providers must start with "admin"`);
      return false;
    }
    return true;
  }).filter(sanitizeProvider);

  if (!Array.isArray(filteredAuthProviders) || filteredAuthProviders.length === 0) {
    app.log.warn(`No authentication providers configured! If you need to enable authentication please configure enabledAuthProviders in the config admin section`);
    return app.auth([alwaysFailAuth]); // Return the fail-safe method directly
  }

  const validAuthProviders = mapAuthProviders(app, filteredAuthProviders);

  return app.auth(validAuthProviders)
}