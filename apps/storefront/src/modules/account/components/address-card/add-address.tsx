"use client"

/**
 * "Nueva dirección" tile and its dialog.
 *
 * The dialog is the shared `Modal`, which is a Headless UI `Dialog`: it traps
 * focus while open, moves focus into the panel, restores it on close and
 * handles Escape. That is the existing confirmation/entry pattern in this
 * codebase, so it is reused rather than replaced.
 *
 * The first address a shopper saves becomes both of Medusa's defaults
 * (`is_default_billing` and `is_default_shipping`). That decision lives in the
 * server action, not here, so a direct POST behaves the same.
 */

import { useActionState, useEffect, useState } from "react"
import { Plus } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import {
  addCustomerAddress,
  type AddressActionState,
} from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { Button, Heading } from "@modules/common/components/ui"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Modal from "@modules/common/components/modal"
import AddressFormFields from "./address-form-fields"

const INITIAL_STATE: AddressActionState = { success: false, error: null, fieldErrors: {} }

const AddAddress = ({ region }: { region: HttpTypes.StoreRegion }) => {
  const { state, open, close } = useToggleState(false)
  const [saved, setSaved] = useState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, INITIAL_STATE)

  useEffect(() => {
    if (formState.success) {
      setSaved(true)
    }
  }, [formState.success])

  // Close on success so the shopper sees the new card in the grid behind.
  useEffect(() => {
    if (saved) {
      close()
    }
  }, [saved, close])

  const handleClose = () => {
    setSaved(false)
    close()
  }

  return (
    <>
      <button
        type="button"
        className="border border-gray-200 rounded-rounded p-5 min-h-[220px] h-full w-full flex flex-col justify-between text-left hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
        onClick={open}
        data-testid="add-address-button"
      >
        <span className="text-base-semi">{t("account.addresses.add")}</span>
        <Plus />
      </button>

      <Modal isOpen={state} close={handleClose} data-testid="add-address-modal">
        <Modal.Title>
          <Heading className="mb-2">{t("account.addresses.addTitle")}</Heading>
        </Modal.Title>
        <form action={formAction} noValidate>
          <Modal.Body>
            <AddressFormFields
              region={region}
              fieldErrors={formState.fieldErrors}
              countryError={formState.fieldErrors.countryCode}
            />
            {formState.error ? (
              <div role="alert" className="text-rose-500 text-small-regular py-2" data-testid="address-error">
                {formState.error}
              </div>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6 w-full">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
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
    </>
  )
}

export default AddAddress