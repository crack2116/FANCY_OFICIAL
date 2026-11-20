"use client"

import { Button, Heading } from "@modules/common/components/ui"
import { t } from "@lib/i18n/translations"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-4">
      <Heading
        level="h2"
        className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F352E] pb-3 border-b border-[#EFECE6]"
      >
        {t("cart.summary")}
      </Heading>
      <DiscountCode cart={cart} />
      <Divider />
      <CartTotals totals={cart} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
        className="block w-full"
      >
        <Button className="w-full h-11 rounded-xl !bg-[#0F352E] hover:!bg-[#164A40] text-white font-semibold shadow-xs transition-colors">
          {t("cart.checkout")}
        </Button>
      </LocalizedClientLink>
      <LocalizedClientLink
        href="/store"
        className="text-center text-sm font-medium text-[#0F352E] hover:text-[#F36F21] transition-colors py-1"
      >
        {t("cart.continueShopping")}
      </LocalizedClientLink>
      <p className="text-center text-xs text-[#6B7280] pt-1">
        {t("cart.trustLine")}
      </p>
    </div>
  )
}

export default Summary
