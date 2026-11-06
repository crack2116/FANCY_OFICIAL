/**
 * Delivery block on the guest confirmation page.
 *
 * Same component as the account detail uses, so a shopper comparing the two sees
 * identical wording and identical labels for the address fields.
 */

import { HttpTypes } from "@medusajs/types"
import OrderDelivery from "@modules/order/components/order-delivery"

const ShippingDetails = ({ order }: { order: HttpTypes.StoreOrder }) => {
  return <OrderDelivery order={order} />
}

export default ShippingDetails