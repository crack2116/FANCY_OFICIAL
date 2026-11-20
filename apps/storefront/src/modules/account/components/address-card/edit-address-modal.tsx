"use client"

/**
 * One saved address: its values, the actions that change them, and the edit
 * dialog.
 *
 * DEFAULT FLAGS — WHY THERE ARE TWO BUTTONS
 * Medusa 2.21.2's `CustomerAddress` model has exactly two boolean columns,
 * `is_default_billing` and `is_default_shipping`, guarded by two partial unique
 * indexes (`where: '"is_default_*" = true'`). There is no single "preferred"
 * column, so no single "Make default" button is honest — this card therefore
 * offers the two things Medusa actually models, and says so in one line.
 *
 * Moving a flag is a single update; Medusa's
 * `updateCustomerAddressesWorkflow` clears the previous holder first. See
 * `setDefaultCustomerAddress` for the evidence.
 */

import { useActionState, useEffect, useState, useTransition } from "react"
import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import {
  setDefaultCustomerAddress,
  updateCustomerAddress,
  type AddressActionState,
} from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { Button, Heading, Text } from "@modules/common/components/ui"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Modal from "@modules/common/components/modal"
import AddressFormFields from "./address-form-fields"
import DeleteAddressDialog from "./delete-address-dialog"

const INITIAL_STATE: AddressActionState = { success: false, error: null, fieldErrors: {} }

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
}

const EditAddress = ({ region, address }: EditAddressProps) => {
  const edit = useToggleState(false)
  const confirmDelete = useToggleState(false)
  const [saved, setSaved] = useState(false)
  const [defaultError, setDefaultError] = useState<string | null>(null)
  const [defaultSuccess, setDefaultSuccess] = useState(false)
  const [pendingDefault, startDefault] = useTransition()

  const [formState, formAction] = useActionState(updateCustomerAddress, INITIAL_STATE)

  useEffect(() => {
    if (formState.success) {
      setSaved(true)
    }
  }, [formState.success])

  useEffect(() => {
    if (saved) {
      edit.close()
    }
  }, [saved, edit])

  const handleEditClose = () => {
    setSaved(false)
    edit.close()
  }

  const changeDefault = (purpose: "billing" | "shipping") => {
    setDefaultError(null)
    setDefaultSuccess(false)

    startDefault(async () => {
      const result = await setDefaultCustomerAddress(address.id, purpose)
      if (result.error) {
        setDefaultError(result.error)
        return
      }
      setDefaultSuccess(true)
    })
  }

  const isDefaultBilling = Boolean(address.is_default_billing)
  const isDefaultShipping = Boolean(address.is_default_shipping)

  return (
    <>
      <div
        className="border border-gray-200 rounded-rounded p-5 min-h-[220px] h-full w-full flex flex-col justify-between gap-y-4"
        data-testid="address-container"
      >
        <div className="flex flex-col">
          <Heading className="text-left text-base-semi" data-testid="address-name">
            {address.address_name || `${address.first_name ?? ""} ${address.last_name ?? ""}`.trim()}
          </Heading>
          {address.company ? (
            <Text className="txt-compact-small text-ui-fg-base" data-testid="address-company">
              {address.company}
            </Text>
          ) : null}
          <Text className="flex flex-col text-left text-base-regular mt-2">
            <span data-testid="address-address">
              {[address.address_1, address.address_2].filter(Boolean).join(", ")}
            </span>
            <span data-testid="address-postal-city">
              {[address.postal_code, address.city].filter(Boolean).join(", ")}
            </span>
            <span data-testid="address-province-country">
              {[address.province, address.country_code?.toUpperCase()].filter(Boolean).join(", ")}
            </span>
            {address.phone ? (
              <span data-testid="address-phone">{address.phone}</span>
            ) : null}
          </Text>
          <div className="flex flex-wrap gap-2 mt-3">
            {isDefaultBilling ? (
              <span
                className="text-compact-small bg-gray-100 text-gray-700 rounded-full px-2 py-1"
                data-testid="address-default-billing"
              >
                {t("account.addresses.defaultBilling")}
              </span>
            ) : null}
            {isDefaultShipping ? (
              <span
                className="text-compact-small bg-gray-100 text-gray-700 rounded-full px-2 py-1"
                data-testid="address-default-shipping"
              >
                {t("account.addresses.defaultShipping")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            variant="transparent"
            size="small"
            onClick={edit.open}
            data-testid="address-edit-button"
          >
            <Edit className="mr-2" />
            {t("account.profile.edit")}
          </Button>
          <Button
            variant="transparent"
            size="small"
            onClick={confirmDelete.open}
            data-testid="address-delete-button"
          >
            <Trash className="mr-2" />
            {t("account.addresses.delete")}
          </Button>
          {!isDefaultBilling ? (
            <Button
              variant="transparent"
              size="small"
              disabled={pendingDefault}
              onClick={() => changeDefault("billing")}
              data-testid="address-set-default-billing"
            >
              {t("account.addresses.setDefaultBilling")}
            </Button>
          ) : null}
          {!isDefaultShipping ? (
            <Button
              variant="transparent"
              size="small"
              disabled={pendingDefault}
              onClick={() => changeDefault("shipping")}
              data-testid="address-set-default-shipping"
            >
              {t("account.addresses.setDefaultShipping")}
            </Button>
          ) : null}
        </div>

        {defaultError ? (
          <p role="alert" className="text-rose-500 text-small-regular" data-testid="default-error">
            {defaultError}
          </p>
        ) : null}
        {defaultSuccess ? (
          <p role="status" className="text-small-regular" data-testid="default-success">
            {t("account.addresses.defaultUpdated")}
          </p>
        ) : null}
      </div>

      <Modal isOpen={edit.state} close={handleEditClose} data-testid="edit-address-modal">
        <Modal.Title>
          <Heading className="mb-2">{t("account.addresses.editTitle")}</Heading>
        </Modal.Title>
        <form action={formAction} noValidate>
          {/* The address being edited travels as a hidden field so the action is
              a single self-contained form. The server action never trusts it for
              ownership: Medusa's own route scopes the update to the authenticated
              customer and 404s an id that is not theirs. */}
          <input type="hidden" name="addressId" value={address.id} />
          <Modal.Body>
            <AddressFormFields
              region={region}
              address={address}
              fieldErrors={formState.fieldErrors}
              countryError={formState.fieldErrors.countryCode}
            />
            {formState.error ? (
              <div
                role="alert"
                className="text-rose-500 text-small-regular py-2"
                data-testid="address-error"
              >
                {formState.error}
              </div>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6 w-full">
              <Button
                type="button"
                variant="secondary"
                onClick={handleEditClose}
                className="h-10"
                data-testid="cancel-button"
              >
                {t("account.addresses.cancel")}
              </Button>
              <SubmitButton data-testid="save-button">
                {t("account.addresses.save")}
              </SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>

      <DeleteAddressDialog
        addressId={address.id}
        isOpen={confirmDelete.state}
        close={confirmDelete.close}
      />
    </>
  )
}

export default EditAddress