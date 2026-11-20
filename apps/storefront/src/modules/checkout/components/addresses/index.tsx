"use client"
import { setAddresses } from "@lib/data/cart"
import { t } from "@lib/i18n/translations"
import useToggleState from "@lib/hooks/use-toggle-state"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text, clx } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"
  const isCompleted = !isOpen && !!cart?.shipping_address

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  return (
    <div
      className={clx(
        "rounded-2xl border bg-white p-5 sm:p-7 shadow-xs transition-all",
        isOpen ? "border-[#0F352E]/30 ring-1 ring-[#0F352E]/10" : "border-[#E7E5DF]"
      )}
    >
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={clx(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isCompleted
                ? "bg-[#0F352E] text-white"
                : isOpen
                  ? "bg-[#F36F21] text-white"
                  : "bg-[#EFECE6] text-[#6B7280]"
            )}
          >
            1
          </span>
          <Heading
            level="h2"
            className="flex flex-row text-xl sm:text-2xl font-bold tracking-tight text-[#0F352E] gap-x-2 items-center"
          >
            <span>{t("checkout.address.shippingTitle")}</span>
            {isCompleted && (
              <CheckCircleSolid className="h-5 w-5 text-[#0F352E] shrink-0" />
            )}
          </Heading>
        </div>
        {isCompleted && (
          <Text className="shrink-0">
            <button
              type="button"
              onClick={handleEdit}
              className="text-sm font-semibold text-[#F36F21] hover:text-[#D95D14] transition-colors"
              data-testid="edit-address-button"
            >
              {t("checkout.address.edit")}
            </button>
          </Text>
        )}
      </div>
      {isOpen ? (
        <form action={formAction} className="mt-6">
          <div>
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div className="mt-6 pt-6 border-t border-[#EFECE6]">
                <Heading
                  level="h2"
                  className="text-lg sm:text-xl font-bold text-[#0F352E] pb-4"
                >
                  {t("checkout.address.billingTitle")}
                </Heading>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton
              className="mt-6 h-11 rounded-xl !bg-[#0F352E] hover:!bg-[#164A40] px-6 font-semibold text-white shadow-xs"
              data-testid="submit-address-button"
            >
              {t("checkout.address.continue")}
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div className="mt-5 pt-5 border-t border-[#EFECE6]">
          <div className="text-sm">
            {cart && cart.shipping_address ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div
                  className="flex flex-col min-w-0"
                  data-testid="shipping-address-summary"
                >
                  <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                    {t("checkout.address.shippingTitle")}
                  </Text>
                  <Text className="text-sm font-medium text-[#111827] break-words">
                    {cart.shipping_address.first_name}{" "}
                    {cart.shipping_address.last_name}
                  </Text>
                  <Text className="text-sm text-[#4B5563] break-words">
                    {cart.shipping_address.address_1}{" "}
                    {cart.shipping_address.address_2}
                  </Text>
                  <Text className="text-sm text-[#4B5563] break-words">
                    {cart.shipping_address.postal_code},{" "}
                    {cart.shipping_address.city}
                  </Text>
                  <Text className="text-sm text-[#4B5563]">
                    {cart.shipping_address.country_code?.toUpperCase()}
                  </Text>
                </div>

                <div
                  className="flex flex-col min-w-0"
                  data-testid="shipping-contact-summary"
                >
                  <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                    {t("checkout.address.contactTitle")}
                  </Text>
                  <Text className="text-sm text-[#4B5563] break-words">
                    {cart.shipping_address.phone}
                  </Text>
                  <Text className="text-sm text-[#4B5563] break-words">
                    {cart.email}
                  </Text>
                </div>

                <div
                  className="flex flex-col min-w-0"
                  data-testid="billing-address-summary"
                >
                  <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                    {t("checkout.address.billingTitle")}
                  </Text>

                  {sameAsBilling ? (
                    <Text className="text-sm text-[#4B5563]">
                      {t("checkout.address.sameSummary")}
                    </Text>
                  ) : (
                    <>
                      <Text className="text-sm font-medium text-[#111827] break-words">
                        {cart.billing_address?.first_name}{" "}
                        {cart.billing_address?.last_name}
                      </Text>
                      <Text className="text-sm text-[#4B5563] break-words">
                        {cart.billing_address?.address_1}{" "}
                        {cart.billing_address?.address_2}
                      </Text>
                      <Text className="text-sm text-[#4B5563] break-words">
                        {cart.billing_address?.postal_code},{" "}
                        {cart.billing_address?.city}
                      </Text>
                      <Text className="text-sm text-[#4B5563]">
                        {cart.billing_address?.country_code?.toUpperCase()}
                      </Text>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Spinner />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Addresses
