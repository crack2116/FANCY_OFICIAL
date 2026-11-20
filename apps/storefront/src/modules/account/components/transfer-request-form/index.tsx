"use client"

/**
 * Order-ownership transfer.
 *
 * This is the ONLY supported way for a shopper to attach an order they placed as
 * a guest to their account: the current owner receives a link and approves it.
 * It is authenticated, because only the current owner may ask.
 *
 * The success panel deliberately shows `display_id`, not the internal order id.
 */

import { useActionState, useEffect, useState } from "react"
import { CheckCircleMiniSolid, XCircleSolid } from "@medusajs/icons"
import { t } from "@lib/i18n/translations"
import { createTransferRequest } from "@lib/data/orders"
import { Heading, IconButton, Text } from "@modules/common/components/ui"
import { SubmitButton } from "@modules/checkout/components/submit-button"

export default function TransferRequestForm() {
  const [showSuccess, setShowSuccess] = useState(false)

  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  useEffect(() => {
    if (state.success && state.order) {
      setShowSuccess(true)
    }
  }, [state.success, state.order])

  return (
    <div className="flex flex-col gap-y-4 w-full">
      <div className="grid sm:grid-cols-2 items-center gap-x-8 gap-y-4 w-full">
        <div className="flex flex-col gap-y-1">
          <Heading level="h3" className="!text-sm font-semibold text-fg-base">
            {t("order.transfer.request.title")}
          </Heading>
          <p className="text-small-regular text-ui-fg-subtle">
            {t("order.transfer.request.body")}
          </p>
        </div>
        <form action={formAction} className="flex flex-col gap-y-1 sm:items-end">
          <div className="flex flex-col gap-y-2 w-full">
            <label htmlFor="order_id" className="text-sm font-medium self-start">
              {t("order.transfer.request.fieldLabel")}
            </label>
            <input
              id="order_id"
              name="order_id"
              type="text"
              inputMode="numeric"
              placeholder={t("order.transfer.request.placeholder")}
              className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            />
            <SubmitButton
              variant="secondary"
              size="small"
              className="w-fit whitespace-nowrap self-end"
            >
              {t("order.transfer.request.action")}
            </SubmitButton>
          </div>
        </form>
      </div>

      {!state.success && state.error ? (
        <Text className="text-base-regular text-rose-500 text-left" role="alert">
          {state.error}
        </Text>
      ) : null}

      {showSuccess && state.order ? (
        <div className="flex justify-between p-4 bg-neutral-50 shadow-borders-base w-full self-stretch items-center gap-4">
          <div className="flex gap-x-2 items-center">
            <CheckCircleMiniSolid className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col gap-y-1">
              <Text className="text-base-regular text-fg-base">
                {t("order.transfer.request.heading", {
                  id: state.order.display_id ?? state.order.id,
                })}
              </Text>
              <Text className="text-small-regular text-ui-fg-subtle">
                {state.order.email
                  ? t("order.transfer.request.sentTo", { email: state.order.email })
                  : t("order.transfer.request.body")}
              </Text>
            </div>
          </div>
          <IconButton
            className="h-fit"
            aria-label={t("common.close")}
            onClick={() => setShowSuccess(false)}
          >
            <XCircleSolid className="w-4 h-4 text-ui-fg-subtle" />
          </IconButton>
        </div>
      ) : null}
    </div>
  )
}