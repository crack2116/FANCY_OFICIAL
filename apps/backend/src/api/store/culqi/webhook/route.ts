import crypto from "crypto"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules, PaymentWebhookEvents } from "@medusajs/framework/utils"
import { CulqiClient } from "../../../../modules/culqi-payment/client"
import { CulqiIdempotencyStore } from "../../../../modules/culqi-payment/idempotency"
import { assertAmountMatchCents, validateCurrency } from "../../../../modules/culqi-payment/utils"

function safeCompareTokens(a?: string, b?: string): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * `POST /store/culqi/webhook`
 *
 * Hardened webhook receiver for Culqi events.
 *
 * Security & Financial Architecture:
 * 1. Webhook Secret Enforcement: In production, CULQI_WEBHOOK_SECRET is mandatory (fail-closed).
 *    Validated with timingSafeEqual.
 * 2. Mandatory Zero-Trust Server-to-Server Lookup: Queries Culqi API directly via TLS with `CULQI_SECRET_KEY`
 *    to confirm the charge actually exists, belongs to our merchant account, and verify amount and currency.
 * 3. Amount & Currency Matching: Strictly checks PEN currency and matches event amount against remote charge.
 * 4. Persistent Transactional Idempotency: Records the event in the PostgreSQL `culqi_operations` ledger
 *    to prevent duplicate effects from re-deliveries, network glitches, or out-of-order events.
 * 5. Unified Authority: Dispatches the verified event to Medusa's authoritative payment event pipeline
 *    so both `/hooks/payment/culqi` and `/store/culqi/webhook` share the exact same financial processing engine.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  // 1. Webhook Secret Authentication
  const configuredWebhookSecret = process.env.CULQI_WEBHOOK_SECRET
  const isProduction = process.env.NODE_ENV === "production"

  if (isProduction && !configuredWebhookSecret) {
    logger.error("[Culqi Webhook] CULQI_WEBHOOK_SECRET is not configured in production mode. Refusing open webhook.")
    return res.status(500).json({
      error: "Misconfigured Server",
      message: "Webhook secret configuration is strictly required in production.",
    })
  }

  if (configuredWebhookSecret) {
    const authHeader = req.headers["authorization"] || req.headers["x-culqi-webhook-token"]
    const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : undefined

    if (!token || !safeCompareTokens(token, configuredWebhookSecret)) {
      logger.warn("[Culqi Webhook] Unauthorized webhook attempt: missing or invalid webhook token.")
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid webhook credentials.",
      })
    }
  }

  const payload = req.body as Record<string, any>
  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ error: "Empty payload received." })
  }

  const eventType = payload.type || payload.event || "unknown"
  const rawData = (payload.data || payload) as Record<string, any>
  const chargeId = (rawData.id || rawData.charge_id || rawData.data?.id || rawData.data?.charge_id) as string | undefined

  logger.info(`[Culqi Webhook] Received event '${eventType}' for target ID: ${chargeId || "none"}`)

  // Non-charge events acknowledged cleanly without financial effect
  if (!chargeId) {
    return res.status(200).json({ received: true, status: "ignored_no_target_id" })
  }

  const secretKey = process.env.CULQI_SECRET_KEY
  if (!secretKey) {
    logger.warn("[Culqi Webhook] CULQI_SECRET_KEY is not configured on server. Cannot perform remote verification.")
    return res.status(503).json({
      error: "Service Unavailable",
      message: "Gateway credentials not configured.",
    })
  }

  try {
    // 2. Mandatory Zero-Trust Server-to-Server Verification
    let remoteCharge: any = null
    try {
      const client = new CulqiClient({ secretKey }, logger)
      remoteCharge = await client.getCharge(chargeId)
    } catch (fetchErr: any) {
      logger.error(`[Culqi Webhook] Remote charge lookup failed: ${fetchErr.message}`)
      return res.status(400).json({ error: "Charge verification failed.", message: fetchErr.message })
    }

    if (!remoteCharge || remoteCharge.id !== chargeId) {
      logger.error(`[Culqi Webhook] Remote charge verification failed: charge ${chargeId} not found on Culqi.`)
      return res.status(400).json({ error: "Charge verification failed." })
    }

    // 3. Currency and Amount Validation
    validateCurrency(remoteCharge.currency_code)
    const remoteCentimos = remoteCharge.amount // remoteCharge.amount is ALREADY in céntimos

    const eventCharge = rawData?.data as Record<string, any> | undefined
    const eventAmount = typeof eventCharge?.amount === "number" ? eventCharge.amount : undefined
    if (eventAmount !== undefined && !assertAmountMatchCents(eventAmount, remoteCentimos)) {
      logger.warn(
        `[Culqi Webhook] Amount mismatch: event=${eventAmount} vs remoteCharge=${remoteCentimos}. Rejecting event.`
      )
      return res.status(400).json({ error: "Amount mismatch detected." })
    }

    const sessionId =
      (remoteCharge.metadata?.session_id as string) ||
      (rawData.metadata?.session_id as string)

    logger.info(
      `[Culqi Webhook] Server-to-server verified: charge=${remoteCharge.id}, amount=${remoteCentimos} PEN céntimos, capture=${remoteCharge.capture}`
    )

    // 4. Persistent Transactional Idempotency
    let knex: any = null
    try {
      knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      if (typeof knex !== "function") {
        knex = null
      }
    } catch {
      knex = null
    }

    if (!knex && process.env.NODE_ENV === "production" && process.env.ALLOW_MEMORY_IDEMPOTENCY !== "true") {
      logger.error("[Culqi Webhook] PostgreSQL connection unavailable for financial idempotency in production.")
      return res.status(503).json({
        received: false,
        message: "Database unavailable for financial idempotency ledger; retry requested.",
      })
    }

    const idempotencyStore = new CulqiIdempotencyStore(knex, logger)
    const eventId = payload.id || `${chargeId}_${eventType}`
    const idempotencyKey = payload.id
      ? `webhook:${payload.id}`
      : `webhook:${chargeId}:${eventType}`

    const lock = await idempotencyStore.acquireLock(idempotencyKey, {
      operation_type: "webhook",
      charge_id: remoteCharge.id,
      session_id: sessionId,
      amount: remoteCentimos,
      currency_code: "PEN",
      event_type: eventType,
      event_date: Number(payload.creation_date || remoteCharge.creation_date || Date.now()),
    })

    if (lock.isDuplicate) {
      if (lock.record.status === "completed") {
        logger.info(`[Culqi Webhook] Idempotent hit: event ${eventId} already processed.`)
        return res.status(200).json({
          received: true,
          charge_id: remoteCharge.id,
          status: "already_processed",
        })
      }
      if (lock.record.status === "processing") {
        logger.warn(
          `[Culqi Webhook] Concurrent processing detected for event ${eventId}. Returning HTTP 409 Conflict to request retry.`
        )
        return res.status(409).json({
          received: false,
          charge_id: remoteCharge.id,
          status: "concurrent_processing",
          message: "Concurrent processing in progress; retry requested.",
        })
      }
    }

    // Check if session is already captured
    if (sessionId) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: payments } = await query.graph({
        entity: "payment_session",
        fields: ["id", "status", "data", "payment_collection_id"],
        filters: { id: sessionId },
      }).catch(() => ({ data: [] }))

      const paymentSession = payments?.[0]
      if (paymentSession && paymentSession.status === "captured") {
        logger.info(`[Culqi Webhook] Payment session ${sessionId} is already marked as captured. Idempotent skip.`)
        await idempotencyStore.complete(idempotencyKey, {
          charge_id: remoteCharge.id,
          amount: remoteCentimos,
          status: "completed",
          response_payload: remoteCharge as any,
        })
        return res.status(200).json({
          received: true,
          charge_id: remoteCharge.id,
          status: "already_captured",
        })
      }
    }

    // 5. Unified Authority: Forward to Medusa Payment Event Pipeline if available
    try {
      const eventBus = req.scope.resolve(Modules.EVENT_BUS)
      if (eventBus && typeof eventBus.emit === "function") {
        await eventBus.emit({
          name: PaymentWebhookEvents.WebhookReceived,
          data: {
            provider: "culqi",
            payload: { data: payload, rawData: req.rawBody, headers: req.headers },
          },
        }, {
          delay: 1000,
          attempts: 3,
        })
      }
    } catch (eventErr: any) {
      logger.warn(`[Culqi Webhook] Could not emit WebhookReceived event: ${eventErr.message}`)
    }

    await idempotencyStore.complete(idempotencyKey, {
      charge_id: remoteCharge.id,
      amount: remoteCentimos,
      status: "completed",
      response_payload: remoteCharge as any,
    })

    return res.status(200).json({
      received: true,
      charge_id: remoteCharge.id,
      event: eventType,
      verified: true,
      captured: remoteCharge.capture,
      amount: remoteCentimos,
      currency: "PEN",
    })
  } catch (err: any) {
    logger.error(`[Culqi Webhook] Error verifying or processing webhook: ${err.message}`)
    return res.status(500).json({
      error: "Webhook Processing Error",
      message: err.message,
    })
  }
}
