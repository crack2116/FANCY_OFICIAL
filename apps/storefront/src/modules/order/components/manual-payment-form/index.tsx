"use client"

import React, { useState } from "react"
import { submitManualPaymentReference } from "@lib/data/orders"
import { t } from "@lib/i18n/translations"
import { Button } from "@modules/common/components/ui"

interface ManualPaymentFormProps {
  orderId: string
  email?: string
  token?: string
  initialReference?: string
  initialStatus?: string
}

export default function ManualPaymentForm({
  orderId,
  email,
  token,
  initialReference,
  initialStatus,
}: ManualPaymentFormProps) {
  const [reference, setReference] = useState(initialReference || "")
  const [method, setMethod] = useState("transferencia")
  const [status, setStatus] = useState(initialStatus || "pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isCaptured = status === "verified_and_captured"
  const isRejected = status === "rejected"

  const yapePhone = process.env.NEXT_PUBLIC_YAPE_PHONE
  const plinPhone = process.env.NEXT_PUBLIC_PLIN_PHONE
  const bankAccounts = process.env.NEXT_PUBLIC_BANK_ACCOUNTS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reference.trim()) {
      setError(t("order.manualPayment.errorReferenceRequired"))
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    const result = await submitManualPaymentReference(orderId, reference.trim(), method, email, token)
    setIsSubmitting(false)

    if (result.success) {
      setStatus("pending_verification")
      setMessage(t("order.manualPayment.success"))
    } else {
      setError(result.error || t("order.manualPayment.errorSubmit"))
    }
  }

  return (
    <div className="bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4 mt-4 flex flex-col gap-y-3">
      <h3 className="text-base font-semibold text-ui-fg-base">
        {t("order.manualPayment.title")}
      </h3>

      {/* Official accounts or pending notice */}
      {yapePhone || plinPhone || bankAccounts ? (
        <div className="text-sm bg-ui-bg-base p-3 rounded border border-ui-border-subtle flex flex-col gap-y-1">
          <p className="font-medium text-ui-fg-base">
            {t("order.manualPayment.officialAccounts")}
          </p>
          {yapePhone && <p className="text-ui-fg-subtle">Yape: <span className="font-mono text-ui-fg-base">{yapePhone}</span></p>}
          {plinPhone && <p className="text-ui-fg-subtle">Plin: <span className="font-mono text-ui-fg-base">{plinPhone}</span></p>}
          {bankAccounts && <p className="text-ui-fg-subtle whitespace-pre-line">{bankAccounts}</p>}
        </div>
      ) : (
        <div className="text-sm bg-amber-50 text-amber-900 border border-amber-200 p-3 rounded">
          <p className="font-medium">
            {t("order.manualPayment.pendingTitle")}
          </p>
          <p className="text-xs mt-1">
            {t("order.manualPayment.pendingBody")}
          </p>
        </div>
      )}

      {/* Current status display */}
      {isCaptured ? (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-3 rounded text-sm">
          <p className="font-semibold">
            ✓ {t("order.manualPayment.verifiedTitle")}
          </p>
          <p className="text-xs mt-0.5">
            {t("order.manualPayment.verifiedBody")}
          </p>
        </div>
      ) : isRejected ? (
        <div className="bg-rose-50 text-rose-900 border border-rose-200 p-3 rounded text-sm">
          <p className="font-semibold">
            ✗ {t("order.manualPayment.rejectedTitle")}
          </p>
          <p className="text-xs mt-0.5">
            {t("order.manualPayment.rejectedBody")}
          </p>
        </div>
      ) : status === "pending_verification" || initialReference ? (
        <div className="bg-blue-50 text-blue-900 border border-blue-200 p-3 rounded text-sm">
          <p className="font-semibold">
            ⏳ {t("order.manualPayment.pendingVerificationTitle")}
          </p>
          <p className="text-xs mt-0.5">
            {t("order.manualPayment.operationNumber")}{" "}
            <span className="font-mono font-medium">{reference}</span>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            {t("order.manualPayment.pendingVerificationBody")}
          </p>
        </div>
      ) : null}

      {/* Submission form if not captured yet */}
      {!isCaptured && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-2 mt-1">
          <label className="text-xs font-medium text-ui-fg-subtle">
            {t("order.manualPayment.referenceLabel")}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="text-xs bg-ui-bg-base border border-ui-border-base rounded px-2 py-1.5 text-ui-fg-base"
              disabled={isSubmitting}
            >
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">
                {t("order.manualPayment.methodBankTransfer")}
              </option>
            </select>
            <input
              type="text"
              placeholder={t("order.manualPayment.referencePlaceholder")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="text-xs bg-ui-bg-base border border-ui-border-base rounded px-3 py-1.5 flex-1 text-ui-fg-base font-mono"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="small"
              variant="secondary"
              isLoading={isSubmitting}
              disabled={isSubmitting || !reference.trim()}
            >
              {t("order.manualPayment.submit")}
            </Button>
          </div>
          {message && <p className="text-xs text-emerald-600 mt-1">{message}</p>}
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </form>
      )}
    </div>
  )
}
