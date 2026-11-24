/**
 * Payment information — honest and generic.
 *
 * THIS BUILD USES A DEVELOPMENT PAYMENT PROVIDER
 * The Peru region is configured with `pp_system_default`, which authorises
 * without contacting a gateway. There is therefore NO card number, NO brand and
 * NO last four digits to show, and the UI says exactly that instead of
 * simulating "Visa •••• 4242", which would be a lie a shopper could rely on.
 *
 * The protected account route deliberately does not return `payments` at all —
 * only a payment collection's own `status` and `amount`. Nothing here reads a
 * provider id, a session, an authorization or a raw provider response, so there
 * is nothing sensitive to accidentally print. The collection status and the
 * amount are the only two facts a shopper needs here; the per-payment detail
 * lives on the store's own confirmation flow if it ever needs it.
 *
 * Note that the collection status enum (`pending`/`authorized`/`captured`/…)
 * belongs to the Payment Collection Module and is NOT the order's
 * `payment_status`; the order's own payment status is shown at the top of the
 * page, and this block deliberately labels them differently.
 */

import { HttpTypes } from "@medusajs/types"
import { getManualPaymentStatus } from "@lib/data/orders"
import { t } from "@lib/i18n/translations"
import { convertToLocale } from "@lib/util/money"
import { resolvePaymentCollectionStatus } from "@lib/order-status"
import { Heading } from "@modules/common/components/ui"
import ManualPaymentForm from "../manual-payment-form"
import { generateOrderToken } from "@lib/util/order-token"

const OrderPayment = async ({ order }: { order: HttpTypes.StoreOrder }) => {
  const collection = order.payment_collections?.[0]
  const collectionStatus = resolvePaymentCollectionStatus(collection?.status)
  const meta = (order.metadata as Record<string, unknown>) || {}
  const guestToken = order.email
    ? generateOrderToken(order.id, order.email, order.created_at)
    : undefined

  const manualInfo = await getManualPaymentStatus(order.id, guestToken)
  const isAlreadyCaptured =
    order.payment_status === "captured" || collection?.status === "completed"

  const resolvedReference =
    (meta.manual_payment_reference as string | undefined) ||
    (manualInfo?.manual_payment_reference ?? undefined)

  const resolvedStatus = isAlreadyCaptured
    ? "verified_and_captured"
    : (meta.manual_payment_status as string | undefined) ||
      manualInfo?.manual_payment_status ||
      undefined

  return (
    <section aria-labelledby="order-payment-heading" data-testid="order-payment">
      <Heading id="order-payment-heading" level="h2" className="text-large-semi mb-3">
        {t("account.order.payment.title")}
      </Heading>
      {collection ? (
        <div className="flex flex-col gap-y-3">
          <div>
            <p className="txt-medium-plus text-ui-fg-base" data-testid="payment-provider">
              {t("account.order.payment.developmentProvider")}
            </p>
            <p className="txt-medium text-ui-fg-subtle" data-testid="payment-provider-note">
              {t("account.order.payment.developmentProviderBody")}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <p className="txt-medium-plus text-ui-fg-base">
                {t("account.order.payment.collectionStatus")}
              </p>
              <p className="txt-medium text-ui-fg-subtle" data-testid="payment-collection-status">
                {collectionStatus.label}
              </p>
            </div>
            <div>
              <p className="txt-medium-plus text-ui-fg-base">
                {t("account.order.payment.amount")}
              </p>
              <p className="txt-medium text-ui-fg-subtle" data-testid="payment-amount">
                {convertToLocale({
                  amount: collection.amount ?? order.total,
                  currency_code: collection.currency_code ?? order.currency_code,
                })}
              </p>
            </div>
          </div>
          <ManualPaymentForm
            orderId={order.id}
            email={order.email ?? undefined}
            token={guestToken}
            initialReference={resolvedReference}
            initialStatus={resolvedStatus}
          />
        </div>
      ) : (
        <p className="txt-medium text-ui-fg-subtle" data-testid="payment-none">
          {t("account.order.payment.none")}
        </p>
      )}
    </section>
  )
}

export default OrderPayment