import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import AccountNav from "../components/account-nav"

/**
 * Shell for the signed-in area: navigation on the left, the parallel-route slot
 * on the right.
 *
 * The footer block used to link to `/customer-service`, a page this build does
 * not have. A link to a 404 is worse than plain copy, so the help text stays and
 * the link is gone.
 */
const AccountLayout = ({
  customer,
  children,
}: {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}) => {
  if (!customer) {
    return (
      <div
        className="flex min-h-[calc(100svh-13rem)] items-center justify-center px-4 py-10 small:py-16"
        data-testid="account-page"
      >
        <div className="w-full max-w-md">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 small:py-12" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto bg-white flex flex-col">
        <div className="grid grid-cols-1 small:grid-cols-[240px_1fr] py-12 gap-y-8">
          <div>
            <AccountNav customer={customer} />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
        <div className="flex flex-col small:flex-row items-start small:items-end justify-between small:border-t border-gray-200 py-12 gap-8">
          <div>
            <h3 className="text-xl-semi mb-4">{t("account.help.title")}</h3>
            <span className="txt-medium max-w-prose">{t("account.help.body")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout