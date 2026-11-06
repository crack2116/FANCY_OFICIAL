/**
 * Admin extension translations.
 *
 * WHY THIS FILE EXISTS
 * Medusa's own Spanish catalogue (`@medusajs/dashboard/src/i18n/translations/
 * es.json`) translates the login screen, but it translates it to Medusa's own
 * brand:
 *
 *   "login.title": "Bienvenido a Medusa"
 *
 * That string is a literal in the dashboard package, not something derived from
 * the store, so renaming the store does NOT change it. The sidebar header is the
 * opposite case - it reads `store.name` and needs no translation - which is why
 * `store.name` was set to "FANCY PET PERU OFICIAL" while this file is still
 * needed for the login screen.
 *
 * HOW THE OVERRIDE WORKS
 * `DashboardApp.populateI18n()` starts from the core translations and
 * `deepMerge`s each plugin's resources on top:
 *
 *   let resources = { ...coreTranslations }
 *   for (const plugin of plugins) {
 *     resources = deepMerge(resources, plugin.i18nModule?.resources)
 *   }
 *
 * So a key here overrides the same key from the dashboard for THIS project
 * only. Nothing in `node_modules` is patched, and a Medusa upgrade that changes
 * its own copy of these strings leaves this override intact.
 *
 * WHY ONLY `es`
 * The dashboard reads its language from a `lng` cookie (see its
 * `src/i18n/config.ts`: `lookupCookie: "lng"`, `fallbackLng: "en"`). Only the
 * Spanish resource is registered here, so an operator browsing in English keeps
 * Medusa's English strings rather than seeing Spanish branding - the override is
 * scoped to the language it is written in.
 *
 * WHAT IS NOT OVERRIDDEN, AND WHY
 * The login screen's logo is an inline SVG in the dashboard's `avatar-box.tsx`,
 * not a string, so no translation key can replace it. The injectable zones
 * `login.before` / `login.after` add content but cannot remove the avatar.
 * Replacing that mark would mean forking the login route, which is explicitly
 * out of scope for this project.
 */

// Plain import, no `with { type: "json" }`.
// `src/admin/tsconfig.json` sets `module: "ESNext"` WITHOUT `esModuleInterop`
// and the root backend tsconfig does not enable import attributes either, so the
// attribute form fails with TS2823. `resolveJsonModule` is on, so the default
// import is the form this project actually compiles.
import es from "./json/es.json"

export default {
  es: {
    translation: es,
  },
}