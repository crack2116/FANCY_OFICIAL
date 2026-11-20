import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import AddAddress from "../address-card/add-address"
import EditAddress from "../address-card/edit-address-modal"

/**
 * The customer's saved addresses.
 *
 * One card per address plus the "new address" tile. A single column below the
 * `small` (1024px) breakpoint and two above it: at 390px a two-column grid would
 * put a nine-field form in a 170px column.
 *
 * There is deliberately no cap on how many addresses a customer may save.
 */
const AddressBook = ({
  customer,
  region,
}: {
  customer: HttpTypes.StoreCustomer
  region: HttpTypes.StoreRegion
}) => {
  const addresses = customer.addresses ?? []

  if (!addresses.length) {
    return (
      <div className="w-full" data-testid="address-book">
        <p className="text-base-regular text-fg-base mb-4" data-testid="addresses-empty">
          {t("account.addresses.empty")}
        </p>
        <div className="grid grid-cols-1 small:grid-cols-2 gap-4">
          <AddAddress region={region} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="address-book">
      <p className="text-base-regular text-fg-base mb-4">{t("account.addresses.defaultNote")}</p>
      <div className="grid grid-cols-1 small:grid-cols-2 gap-4">
        <AddAddress region={region} />
        {addresses.map((address) => (
          <EditAddress region={region} address={address} key={address.id} />
        ))}
      </div>
    </div>
  )
}

export default AddressBook