import { t } from "@lib/i18n/translations"
import { Heading } from "@modules/common/components/ui"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const CheckoutSummary = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  return (
    <div className="lg:sticky lg:top-24 flex flex-col gap-y-6">
      <div className="w-full rounded-2xl border border-[#E7E5DF] bg-white p-5 sm:p-7 shadow-xs flex flex-col gap-y-5">
        <Heading
          level="h2"
          className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F352E] pb-3 border-b border-[#EFECE6]"
        >
          {t("checkout.summary.title")}
        </Heading>
        <ItemsPreviewTemplate cart={cart} />
        <DiscountCode cart={cart} />
        <Divider />
        <CartTotals totals={cart} />
      </div>
    </div>
  )
}

export default CheckoutSummary
