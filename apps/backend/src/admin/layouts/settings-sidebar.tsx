/**
 * Settings sidebar layout that keeps the "Desarrollador" group for developers.
 *
 * WHY THIS EXISTS
 * ---------------
 * Medusa 2.21.2 renders the settings sidebar `developer` section unconditionally.
 * `useDeveloperRoutes()` in the dashboard carries no permission check, and the
 * `secret-api-keys`, `publishable-api-keys`, `workflows` and `search` routes
 * declare neither `RoutePermissionGuard` nor `handle.permissions`. Every staff
 * account therefore sees API keys and workflows.
 *
 * Plugin layouts overwrite core layouts by id in the registry with no merge, and
 * the composer iterates only the section ids the registered config declares. So
 * re-registering `core:settings-sidebar` without `developer` removes the group
 * instead of falling back to core.
 *
 * THIS IS PRESENTATION ONLY
 * -------------------------
 * The routes and the `/admin/*` endpoints remain reachable by direct URL. Server
 * side enforcement needs `MEDUSA_FF_RBAC`, which ships disabled. Do not describe
 * this file as access control.
 *
 * WHY NATIVE ELEMENTS
 * -------------------
 * The core layout composes each group from `radix-ui` Collapsible and a
 * `@medusajs/icons` glyph. Neither package resolves from `apps/backend` and
 * neither is a declared dependency, so importing them would be an undeclared
 * import. `details`/`summary` gives the same disclosure behaviour with no
 * dependency.
 *
 * WHY DEFAULT TO SHOWN
 * -------------------
 * Accounts that predate this change carry no `metadata.role`. Hiding the group
 * for them would silently remove access a panel owner already had, so only an
 * explicit `manager` role hides it.
 */

import { defineLayoutConfig } from "@medusajs/admin-sdk"
import { Divider, Text, clx } from "@medusajs/ui"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { filterGeneralSection } from "../lib/settings-general-filter"

/**
 * The one role that hides the developer group. Every other value, including a
 * missing one, keeps the current behaviour.
 */
const MANAGER_ROLE = "manager"

const hasContent = (node: ReactNode): boolean =>
  Array.isArray(node) ? node.length > 0 : Boolean(node)

const GroupDivider = () => (
  <div className="flex items-center justify-center px-3">
    <Divider variant="dashed" />
  </div>
)

/**
 * Disclosure group matching the core sidebar's visual rhythm: muted small-caps
 * heading, hairline dashed separator between groups, evenly spaced entries.
 */
const CollapsibleGroup = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <details className="group py-3" open>
    <summary className="text-ui-fg-muted flex h-7 cursor-pointer list-none items-center justify-between px-2 select-none [&::-webkit-details-marker]:hidden">
      <Text size="small" leading="compact">
        {label}
      </Text>
      <span
        aria-hidden="true"
        className="text-ui-fg-muted transition-transform duration-150 group-open:rotate-180"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </summary>
    <div className="flex flex-col gap-y-0.5 px-3 pt-0.5">{children}</div>
  </details>
)

/**
 * Reads the signed-in admin user to decide whether to show the developer group.
 *
 * THE ACTUAL ADMIN AUTH CHAIN, so the next reader does not have to re-derive it
 * -------------------------------------------------------------------------
 * 1. `POST /auth/user/emailpass` answers 200 with a JSON `token` and sets no
 *    cookie of its own.
 * 2. The dashboard then calls `POST /auth/session` with that token as a bearer,
 *    which is what actually sets the `connect.sid` cookie.
 * 3. Every later admin request authenticates with that cookie.
 *
 * So `credentials: "include"` is correct here, matching `src/admin/lib/admin-api.ts`.
 * A bearer token also works, but it would mean hardcoding the js-sdk storage key
 * `medusa_auth_token`, which `ADMIN_JWT_TOKEN_STORAGE_KEY` can override. The
 * cookie path has no such coupling.
 *
 * Verified against the running backend: a cookie-only request to `/admin/users/me`
 * answers `{"user":{"metadata":{"role":"manager"}}}`, and a cookie-only request to
 * an unrelated admin route answers 200.
 *
 * Defaults to `false`, which keeps the group visible. A failed lookup must not
 * remove a panel the owner already had, and this control is presentation rather
 * than authorization, so failing open here cannot expose anything the account did
 * not already reach.
 */
const useIsManager = (): boolean => {
  const [isManager, setIsManager] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch("/admin/users/me", {
      credentials: "include",
      headers: { accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || !body?.user) {
          return
        }
        setIsManager(body.user.metadata?.role === MANAGER_ROLE)
      })
      .catch(() => {
        // Keep the default. The group stays visible for an unresolved lookup.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return isManager
}

const SettingsSidebarLayout = ({
  sections,
  className,
}: {
  sections: Record<string, ReactNode>
  data?: unknown
  className?: string
}) => {
  const { t } = useTranslation()
  const isManager = useIsManager()

  return (
    <div className={clx("flex flex-1 flex-col", className)}>
      <CollapsibleGroup label={t("app.nav.settings.general")}>
        {filterGeneralSection(sections.general)}
      </CollapsibleGroup>
      <GroupDivider />
      <CollapsibleGroup label={t("app.nav.settings.myAccount")}>
        {sections.myAccount}
      </CollapsibleGroup>
      {hasContent(sections.extensions) && (
        <>
          <GroupDivider />
          <CollapsibleGroup label={t("app.nav.common.extensions")}>
            {sections.extensions}
          </CollapsibleGroup>
        </>
      )}
      {sections.developer && !isManager && (
        <>
          <GroupDivider />
          <CollapsibleGroup label={t("app.nav.settings.developer")}>
            {sections.developer}
          </CollapsibleGroup>
        </>
      )}
    </div>
  )
}

export default SettingsSidebarLayout

export const config = defineLayoutConfig({
  id: "core:settings-sidebar",
  sections: [
    { id: "general", ordering: "list" },
    { id: "developer", ordering: "list" },
    { id: "myAccount", ordering: "list" },
    { id: "extensions", ordering: "list" },
  ],
})
