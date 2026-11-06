import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import { CulqiClient } from "./client"
import { CulqiIdempotencyStore } from "./idempotency"
import { fromCulqiCentimos, requireStoredCentimos, validateCurrency } from "./utils"

export interface ReconciliationReport {
  matched: boolean
  reconciled: boolean
  session_id: string
  charge_id?: string
  order_id?: string
  action_taken: "none" | "captured" | "marked_failed" | "mismatch_flagged"
  discrepancies: string[]
  local_status: string
  remote_status: string
  local_amount_cents?: number
  remote_amount_cents?: number
  currency: string
  timestamp: string
  audit: {
    reconciled_by?: string
    reconciled_at: string
    evidence: Record<string, unknown>
  }
}

export interface ReconcileOptions {
  sessionId?: string
  orderId?: string
  chargeId?: string
  actorId?: string
  autoFix?: boolean
}

/**
 * Financial Reconciliation Engine for Culqi Payments in FancyPeru.
 *
 * Compares Medusa's internal transactional state against the authoritative truth
 * from the Culqi API. Detects dropped webhooks, timeouts, browser disconnects,
 * payment mismatches, and recovers uncertain operations safely without double charges.
 */
export class CulqiReconciliationService {
  private client: CulqiClient
  private idempotencyStore: CulqiIdempotencyStore
  private logger?: Logger

  constructor(client: CulqiClient, idempotencyStore: CulqiIdempotencyStore, logger?: Logger) {
    this.client = client
    this.idempotencyStore = idempotencyStore
    this.logger = logger
  }

  /**
   * Reconciles a payment session or order against Culqi's remote API.
   */
  async reconcile(
    container: any,
    options: ReconcileOptions
  ): Promise<ReconciliationReport> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const now = new Date().toISOString()
    const discrepancies: string[] = []

    // 1. Resolve Payment Session and Order
    let sessionId = options.sessionId
    let orderId = options.orderId
    let paymentSession: any = null
    let order: any = null

    if (orderId && !sessionId) {
      const { data: orders } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "status",
          "currency_code",
          "payment_collections.id",
          "payment_collections.status",
          "payment_collections.amount",
          "payment_collections.currency_code",
          "payment_collections.captured_amount",
          "payment_collections.refunded_amount",
          "payment_collections.payments.id",
          "payment_collections.payments.status",
          "payment_collections.payments.amount",
          "payment_collections.payment_sessions.id",
          "payment_collections.payment_sessions.status",
          "payment_collections.payment_sessions.amount",
          "payment_collections.payment_sessions.currency_code",
          "payment_collections.payment_sessions.data",
          "payment_collections.payment_sessions.provider_id",
          "payment_collections.payment_sessions.payment_collection_id",
          "customer.email",
        ],
        filters: { id: orderId },
      }).catch(() => ({ data: [] }))

      order = orders?.[0]
      if (!order) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} not found for reconciliation.`)
      }

      const pCol = order.payment_collections?.[0]
      paymentSession = pCol?.payment_sessions?.find(
        (ps: any) => ps.provider_id?.includes("culqi")
      ) || pCol?.payment_sessions?.[0]

      if (paymentSession) {
        sessionId = paymentSession.id
        if (!paymentSession.payment_collection_id && pCol?.id) {
          paymentSession.payment_collection_id = pCol.id
        }
        if (pCol) {
          paymentSession.payment_collection = pCol
        }
      }
    } else if (sessionId) {
      const { data: sessions } = await query.graph({
        entity: "payment_session",
        fields: [
          "id",
          "status",
          "amount",
          "currency_code",
          "data",
          "provider_id",
          "payment_collection_id",
          "payment_collection.amount",
          "payment_collection.currency_code",
          "payment_collection.order.id",
          "payment_collection.order.status",
          "payment_collection.order.customer.email",
        ],
        filters: { id: sessionId },
      }).catch(() => ({ data: [] }))

      paymentSession = sessions?.[0]
      orderId = paymentSession?.payment_collection?.order?.id || orderId
    }

    if (!paymentSession && !options.chargeId) {
      discrepancies.push("Order has no payment sessions or Culqi charges registered.")
      return {
        matched: false,
        reconciled: false,
        session_id: sessionId || "none",
        order_id: orderId,
        action_taken: "none",
        discrepancies,
        local_status: "no_payment_session",
        remote_status: "not_found",
        currency: order?.currency_code || "PEN",
        timestamp: now,
        audit: {
          reconciled_by: options.actorId,
          reconciled_at: now,
          evidence: {
            reason: "no_payment_session",
            discrepancies,
          },
        },
      }
    }

    // 2. Identify Charge ID (from input, session data, or idempotency store)
    let chargeId = options.chargeId || (paymentSession?.data?.charge_id as string | undefined)

    if (!chargeId && sessionId) {
      const recorded = await this.idempotencyStore.getBySessionId(sessionId)
      if (recorded?.charge_id) {
        chargeId = recorded.charge_id
      }
    }

    // 3. If Charge ID is still missing, attempt reverse-lookup on Culqi
    let remoteCharge: any = null
    const customerEmail =
      paymentSession?.payment_collection?.order?.customer?.email ||
      paymentSession?.data?.email

    if (!chargeId && customerEmail && paymentSession?.data?.amount) {
      this.logger?.info?.(
        `[CulqiReconciliation] Charge ID missing for session ${sessionId}. Attempting reverse lookup by customer email and amount.`
      )
      try {
        const listRes = await this.client.listCharges({
          email: customerEmail,
          amount: paymentSession.data.amount,
          currency_code: "PEN",
          limit: 50,
        })
        const match = listRes.data?.find(
          (c: any) => c.metadata?.session_id === sessionId
        )
        if (match) {
          chargeId = match.id
          remoteCharge = match
        }
      } catch (err: any) {
        this.logger?.warn?.(
          `[CulqiReconciliation] Reverse lookup failed: ${err.message}`
        )
      }
    }

    // 4. Query Culqi directly for the charge if not already fetched
    if (chargeId && !remoteCharge) {
      try {
        remoteCharge = await this.client.getCharge(chargeId)
      } catch (err: any) {
        discrepancies.push(`Remote charge ${chargeId} could not be retrieved from Culqi: ${err.message}`)
      }
    }

    const localStatus = paymentSession?.status || "unknown"
    const remoteStatus = remoteCharge?.state || (remoteCharge?.capture ? "captured" : "not_found")
    const localAmountCents = paymentSession?.data?.amount ? Number(paymentSession.data.amount) : undefined
    const remoteAmountCents = remoteCharge?.amount ? Number(remoteCharge.amount) : undefined
    const currency = remoteCharge?.currency_code || paymentSession?.currency_code || "PEN"

    // 5. Audit discrepancies
    if (!remoteCharge) {
      discrepancies.push("No remote charge exists on Culqi corresponding to this session.")
      return {
        matched: false,
        reconciled: false,
        session_id: sessionId || "unknown",
        charge_id: chargeId,
        order_id: orderId,
        action_taken: "none",
        discrepancies,
        local_status: localStatus,
        remote_status: "not_found",
        local_amount_cents: localAmountCents,
        currency,
        timestamp: now,
        audit: {
          reconciled_by: options.actorId || "system",
          reconciled_at: now,
          evidence: { reason: "Charge not found on Culqi. No financial effect applied." },
        },
      }
    }

    // Verify Currency
    try {
      validateCurrency(remoteCharge.currency_code)
    } catch {
      discrepancies.push(`Currency mismatch: Culqi reports '${remoteCharge.currency_code}', expected 'PEN'.`)
    }

    // Verify Amount
    if (localAmountCents && remoteAmountCents && localAmountCents !== remoteAmountCents) {
      discrepancies.push(
        `Amount mismatch: Local session expects ${localAmountCents} céntimos, remote charge is ${remoteAmountCents} céntimos.`
      )
    }

    // Verify Session ID Binding
    if (remoteCharge.metadata?.session_id && sessionId && remoteCharge.metadata.session_id !== sessionId) {
      discrepancies.push(
        `Session binding mismatch: Remote charge metadata links to '${remoteCharge.metadata.session_id}', expected '${sessionId}'.`
      )
    }

    // 6. Action Resolution
    let actionTaken: ReconciliationReport["action_taken"] = "none"
    let reconciled = false

    if (discrepancies.length > 0) {
      actionTaken = "mismatch_flagged"
      this.logger?.warn?.(
        `[CulqiReconciliation] Discrepancies detected during reconciliation for session ${sessionId}: ${discrepancies.join("; ")}`
      )
    } else if (remoteCharge.capture === true) {
      // Remote charge is captured
      if (localStatus === "captured") {
        actionTaken = "none"
        reconciled = true
      } else {
        // REMOTE CAPTURED, LOCAL PENDING: dropped webhook or lost response!
        this.logger?.info?.(
          `[CulqiReconciliation] Remote charge ${remoteCharge.id} is captured but local session ${sessionId} is '${localStatus}'. Synchronizing...`
        )

        if (options.autoFix === true) {
          if (!sessionId || !paymentSession?.payment_collection_id) {
            discrepancies.push(
              "Missing session_id or payment_collection_id; cannot safely perform auto-fix capture synchronization in Medusa."
            )
            actionTaken = "mismatch_flagged"
            reconciled = false
          } else {
            // Trigger capture synchronization in Medusa with full required arguments
            try {
              const paymentModule = container.resolve(Modules.PAYMENT)
              const majorAmount = fromCulqiCentimos(remoteCharge.amount)
              const targetSessionId = sessionId || remoteCharge.metadata?.session_id

              // 1. Update payment session data with authoritative charge
              await paymentModule.updatePaymentSession({
                id: sessionId,
                amount: majorAmount,
                currency_code: currency,
                data: {
                  ...paymentSession.data,
                  charge_id: remoteCharge.id,
                  captured: true,
                  amount: remoteCharge.amount,
                  outcome: remoteCharge.outcome,
                  reconciled_at: now,
                },
                status: "captured",
              })

              // 2. Ensure payment record in Medusa is captured (N7)
              const pCol = paymentSession.payment_collection
              const existingPayment = pCol?.payments?.find(
                (p: any) => p.status === "authorized" || p.status === "pending"
              ) || pCol?.payments?.[0]

              if (existingPayment?.id) {
                if (existingPayment.status !== "captured") {
                  await paymentModule.capturePayment({
                    payment_id: existingPayment.id,
                    amount: majorAmount,
                  })
                }
              } else {
                try {
                  const payment = await paymentModule.authorizePaymentSession(sessionId, {
                    charge_id: remoteCharge.id,
                    reconciled: true,
                  })
                  if (payment?.id) {
                    await paymentModule.capturePayment({
                      payment_id: payment.id,
                      amount: majorAmount,
                    })
                  }
                } catch (authErr: any) {
                  this.logger?.warn?.(
                    `[CulqiReconciliation] authorizePaymentSession during auto-fix: ${authErr.message}`
                  )
                }
              }

              // 3. Close the idempotency store entry using canonical session resolution
              if (targetSessionId) {
                await this.idempotencyStore.completeBySessionId(targetSessionId, {
                  charge_id: remoteCharge.id,
                  amount: remoteCharge.amount,
                  status: "completed",
                  response_payload: remoteCharge,
                })
              }

              actionTaken = "captured"
              reconciled = true
            } catch (syncErr: any) {
              this.logger?.error?.(
                `[CulqiReconciliation] Failed to auto-synchronize local state for session ${sessionId}: ${syncErr.message}`
              )
              discrepancies.push(`Failed to auto-synchronize local state: ${syncErr.message}`)
              actionTaken = "mismatch_flagged"
              reconciled = false
            }
          }
        } else {
          actionTaken = "none"
        }
      }
    } else if (remoteCharge.state === "failed") {
      if (localStatus !== "canceled" && localStatus !== "error") {
        if (options.autoFix === true) {
          try {
            const paymentModule = container.resolve(Modules.PAYMENT)
            const targetSessionId = sessionId || remoteCharge.metadata?.session_id
            if (sessionId) {
              const majorAmount = remoteCharge.amount ? fromCulqiCentimos(remoteCharge.amount) : 0
              await paymentModule.updatePaymentSession({
                id: sessionId,
                amount: majorAmount,
                currency_code: currency,
                data: {
                  ...paymentSession?.data,
                  charge_id: remoteCharge.id,
                  status: "canceled",
                  outcome: remoteCharge.outcome,
                  reconciled_at: now,
                },
                status: "canceled",
              })
            }
            if (targetSessionId) {
              await this.idempotencyStore.completeBySessionId(targetSessionId, {
                charge_id: remoteCharge.id,
                amount: remoteCharge.amount,
                status: "failed",
                response_payload: remoteCharge,
              })
            }
            actionTaken = "marked_failed"
            reconciled = true
          } catch (syncErr: any) {
            discrepancies.push(`Failed to mark payment as failed locally: ${syncErr.message}`)
            actionTaken = "mismatch_flagged"
            reconciled = false
          }
        } else {
          actionTaken = "none"
        }
      }
    }

    return {
      matched: discrepancies.length === 0,
      reconciled,
      session_id: sessionId || remoteCharge.metadata?.session_id || "unknown",
      charge_id: remoteCharge.id,
      order_id: orderId,
      action_taken: actionTaken,
      discrepancies,
      local_status: localStatus,
      remote_status: remoteStatus,
      local_amount_cents: localAmountCents,
      remote_amount_cents: remoteAmountCents,
      currency,
      timestamp: now,
      audit: {
        reconciled_by: options.actorId || "system",
        reconciled_at: now,
        evidence: {
          remote_charge_id: remoteCharge.id,
          remote_capture: remoteCharge.capture,
          remote_state: remoteCharge.state,
          remote_amount: remoteCharge.amount,
          remote_currency: remoteCharge.currency_code,
          outcome: remoteCharge.outcome,
        },
      },
    }
  }
}
