"use client"
import { setAddresses } from "@lib/data/cart"
import { t } from "@lib/i18n/translations"
import useToggleState from "@lib/hooks/use-toggle-state"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import Divider from "@modules/common/components/divider"
import { Heading, Text } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

/**
 * A cart can carry a shipping address that only has the region's country on it
 * (the checkout seeds one before the shopper types anything). Treating that as
 * a complete address printed a bare ", PE" and showed the step's check mark
 * before the shopper had entered a street, a city or a name.
 */
const hasAddressContent = (address?: HttpTypes.StoreCartAddress | null) =>
  Boolean(
    address &&
      (address.first_name ||
        address.last_name ||
        address.address_1 ||
        address.address_2 ||
        address.city ||
        address.postal_code)
  )

const AddressLines = ({
  address,
}: {
  address?: HttpTypes.StoreCartAddress | null
}) => {
  if (!address) {
    return null
  }

  const name = [address.first_name, address.last_name].filter(Boolean).join(" ")
  const street = [address.address_1, address.address_2]
    .filter(Boolean)
    .join(" ")
  const cityLine = [address.postal_code, address.city].filter(Boolean).join(", ")
  const country = address.country_code?.toUpperCase()

  return (
    <>
      {name ? (
        <Text className="txt-medium text-ui-fg-subtle">{name}</Text>
      ) : null}
      {street ? (
        <Text className="txt-medium text-ui-fg-subtle">{street}</Text>
      ) : null}
      {cityLine ? (
        <Text className="txt-medium text-ui-fg-subtle">{cityLine}</Text>
      ) : null}
      {country ? (
        <Text className="txt-medium text-ui-fg-subtle">{country}</Text>
      ) : null}
    </>
  )
}

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
  const hasShippingAddress = hasAddressContent(cart?.shipping_address)
  const hasContact = Boolean(cart?.shipping_address?.phone || cart?.email)

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
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
        >
          {t("checkout.address.shippingTitle")}
          {!isOpen && hasShippingAddress && <CheckCircleSolid />}
        </Heading>
        {!isOpen && cart?.shipping_address && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-address-button"
            >
              {t("checkout.address.edit")}
            </button>
          </Text>
        )}
      </div>
      {isOpen ? (
        <form action={formAction}>
          <div className="pb-8">
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div>
                <Heading
                  level="h2"
                  className="text-3xl-regular gap-x-4 pb-6 pt-8"
                >
                  {t("checkout.address.billingTitle")}
                </Heading>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton className="mt-6" data-testid="submit-address-button">
              {t("checkout.address.continue")}
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && cart.shipping_address ? (
              <div className="flex items-start gap-x-8">
                <div className="flex items-start gap-x-1 w-full">
                  <div
                    className="flex flex-col w-1/3"
                    data-testid="shipping-address-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      {t("checkout.address.shippingTitle")}
                    </Text>
                    {hasShippingAddress ? (
                      <AddressLines address={cart.shipping_address} />
                    ) : (
                      <Text className="txt-medium text-ui-fg-subtle">
                        {t("checkout.address.emptySummary")}
                      </Text>
                    )}
                  </div>

                  <div
                    className="flex flex-col w-1/3 "
                    data-testid="shipping-contact-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      {t("checkout.address.contactTitle")}
                    </Text>
                    {hasContact ? (
                      <>
                        {cart.shipping_address.phone ? (
                          <Text className="txt-medium text-ui-fg-subtle">
                            {cart.shipping_address.phone}
                          </Text>
                        ) : null}
                        {cart.email ? (
                          <Text className="txt-medium text-ui-fg-subtle">
                            {cart.email}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text className="txt-medium text-ui-fg-subtle">
                        {t("checkout.address.emptyContact")}
                      </Text>
                    )}
                  </div>

                  <div
                    className="flex flex-col w-1/3"
                    data-testid="billing-address-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      {t("checkout.address.billingTitle")}
                    </Text>

                    {sameAsBilling ? (
                      <Text className="txt-medium text-ui-fg-subtle">
                        {t("checkout.address.sameSummary")}
                      </Text>
                    ) : hasAddressContent(cart.billing_address) ? (
                      <AddressLines address={cart.billing_address} />
                    ) : (
                      <Text className="txt-medium text-ui-fg-subtle">
                        {t("checkout.address.emptyBilling")}
                      </Text>
                    )}
                  </div>
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
      <Divider className="mt-8" />
    </div>
  )
}

export default Addresses
