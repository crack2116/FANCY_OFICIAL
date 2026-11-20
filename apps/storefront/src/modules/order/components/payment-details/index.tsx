/**
 * Payment block on the guest confirmation page.
 *
 * Same component as the account detail uses. This build runs a development
 * payment provider, so it shows honest generic wording and no simulated card.
 */

import { HttpTypes } from "@medusajs/types"
import OrderPayment from "@modules/order/components/order-payment"

const PaymentDetails = ({ order }: { order: HttpTypes.StoreOrder }) => {
  return <OrderPayment order={order} />
}

export default PaymentDetails