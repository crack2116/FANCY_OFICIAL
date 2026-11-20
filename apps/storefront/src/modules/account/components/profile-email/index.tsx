/**
 * Read-only view of the customer's email.
 *
 * A SERVER component: it holds no state and submits nothing, so making it
 * client-side would ship JavaScript for a static string.
 *
 * WHY THE EMAIL CANNOT BE EDITED HERE
 * Medusa 2.21.2's store validator (`dist/api/store/customers/validators.js`)
 * is
 *
 *   StoreUpdateCustomer = z.object({
 *     company_name, first_name, last_name, phone, metadata
 *   })
 *
 * with no `email` key and neither `.strict()` nor `.passthrough()`. Zod strips
 * unknown keys, so posting `email` returns 200, changes nothing, and reports
 * nothing — the shopper would be told their new address was saved while login
 * kept using the old one. A verified email change needs an Auth-module
 * operation and an email provider, neither of which this build has, so the UI
 * says the feature is coming instead of pretending it works.
 *
 * TODO — verified email change flow
 */

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"

const ProfileEmail = ({ customer }: { customer: HttpTypes.StoreCustomer }) => {
  return (
    <div className="text-small-regular" data-testid="account-email-editor">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-y-1 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("account.profile.section.email")}
          </span>
          <div className="flex items-center min-w-0">
            <span
              className="text-base font-semibold text-[#0F352E] truncate"
              data-testid="current-info"
              data-value={customer.email}
            >
              {customer.email}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600 mt-3" data-testid="email-readonly-note">
        {t("account.profile.email.readonlyNote")}
      </p>
      <p className="text-xs text-slate-500 mt-1">{t("account.profile.email.hint")}</p>
    </div>
  )
}

export default ProfileEmail