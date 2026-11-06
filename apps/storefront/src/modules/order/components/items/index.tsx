/**
 * Order line items on the guest confirmation page.
 *
 * Delegates to the shared `OrderItems`, which reads the order's own snapshot,
 * so the confirmation page and the account detail can never disagree about what
 * was bought.
 */

import { HttpTypes } from "@medusajs/types"
import OrderItems from "@modules/order/components/order-items"

const Items = ({ order }: { order: HttpTypes.StoreOrder }) => {
  return <OrderItems items={order.items ?? []} currencyCode={order.currency_code} />
}

export default Items