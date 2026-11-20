"use client"

/**
 * Confirmation step before an address is deleted.
 *
 * A dialog, not `window.confirm`: the native prompt cannot be styled, cannot be
 * translated consistently, is announced badly by screen readers, and cannot
 * explain WHAT will happen. This one tells the shopper that deleting an address
 * does not touch the orders they already placed — which is true, because an
 * order keeps its own copy of the address (`order_address`).
 *
 * Accessibility comes from the shared `Modal` (Headless UI `Dialog`): focus is
 * trapped while open and restored to the trigger on close, Escape dismisses,
 * and the confirm button takes initial focus.
 */

import { Trash } from "@medusajs/icons"
import { useTransition } from "react"
import { t } from "@lib/i18n/translations"
import { deleteCustomerAddress } from "@lib/data/customer"
import { Button, Heading } from "@modules/common/components/ui"
import Modal from "@modules/common/components/modal"

type DeleteAddressDialogProps = {
  addressId: string
  isOpen: boolean
  close: () => void
}

const DeleteAddressDialog = ({
  addressId,
  isOpen,
  close,
}: DeleteAddressDialogProps) => {
  // `useTransition` rather than `useFormStatus`: this is an imperative action
  // fired from a button, not a form submission.
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCustomerAddress(addressId)
      // On failure the dialog stays open so the shopper can retry without
      // re-finding the address. The message is already Spanish copy chosen by
      // the public-error layer; the raw backend text never reaches here.
      if (result.success) {
        close()
      }
    })
  }

  return (
    <Modal isOpen={isOpen} close={close} size="small" data-testid="delete-address-modal">
      <Modal.Title>
        <Heading className="mb-2">{t("account.addresses.deleteConfirm.title")}</Heading>
      </Modal.Title>
      <Modal.Description>
        {t("account.addresses.deleteConfirm.body")}
      </Modal.Description>
      <Modal.Footer>
        <div className="flex flex-col-reverse xsmall:flex-row gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={close}
            className="h-10 w-full xsmall:w-auto"
            data-testid="delete-cancel-button"
          >
            {t("account.addresses.deleteConfirm.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDelete}
            disabled={pending}
            className="h-10 w-full xsmall:w-auto"
            data-testid="delete-confirm-button"
          >
            <Trash className="mr-2" />
            {pending
              ? t("account.addresses.deleteConfirm.busy")
              : t("account.addresses.deleteConfirm.confirm")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default DeleteAddressDialog