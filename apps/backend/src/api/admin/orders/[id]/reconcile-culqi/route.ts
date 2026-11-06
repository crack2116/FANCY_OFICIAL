/**
 * `POST /admin/orders/:id/reconcile-culqi`
 *
 * Admin-only endpoint that performs active financial reconciliation between
 * Medusa's order payment state and Culqi's remote transaction ledger.
 *
 * Audit & Security:
 * - Requires an authenticated Admin user.
 * - Performs Zero-Trust TLS query directly to Culqi using `CULQI_SECRET_KEY`.
 * - Identifies missing webhooks, timeouts, browser drops, and mismatched amounts.
 * - If Culqi has captured payment and Medusa is pending, safely synchronizes state.
 * - Appends reconciliation audit details to the order's manual_payment_audit_trail.
 * - Never marks an order as paid without cryptographic/server-to-server evidence from Culqi.
 */
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { updateOrderWorkflow } from "@medusajs/medusa/core-flows"
import { CulqiClient } from "../../../../../modules/culqi-payment/client"
import { CulqiIdempotencyStore } from "../../../../../modules/culqi-payment/idempotency"
import { CulqiReconciliationService } from "../../../../../modules/culqi-payment/reconciliation"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const actorId = req.auth_context?.actor_id
  if (!actorId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Payment reconciliation requires an authenticated admin identity."
    )
  }

  const userService = req.scope.resolve(Modules.USER)
  let adminUser
  try {
    adminUser = await userService.retrieveUser(actorId)
  } catch {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      `Admin user ${actorId} does not exist or has been deactivated.`
    )
  }

  const secretKey = process.env.CULQI_SECRET_KEY
  if (!secretKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "CULQI_SECRET_KEY is not configured on the server. Remote reconciliation is unavailable."
    )
  }

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
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "PostgreSQL is required for financial reconciliation in production. Database connection is unavailable."
    )
  }
  const client = new CulqiClient(
    { secretKey, baseUrl: process.env.CULQI_API_URL },
    logger
  )
  const idempotencyStore = new CulqiIdempotencyStore(knex, logger)
  const reconciliationService = new CulqiReconciliationService(client, idempotencyStore, logger)

  const body = (req.validatedBody || req.body || {}) as any
  const report = await reconciliationService.reconcile(req.scope, {
    orderId: id,
    sessionId: body.session_id,
    chargeId: body.charge_id,
    actorId: adminUser.email || actorId,
    autoFix: body.auto_fix === true,
  })

  // If state was reconciled/synchronized, log in order audit trail via updateOrderWorkflow
  if (report.reconciled && report.action_taken !== "none" && report.matched) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "metadata"],
        filters: { id },
      })
      const order = orders?.[0]
      if (order) {
        const metadata = (order.metadata || {}) as Record<string, any>
        const trail = Array.isArray(metadata.manual_payment_audit_trail)
          ? [...metadata.manual_payment_audit_trail]
          : []

        trail.push({
          action: `culqi_reconciliation_${report.action_taken}`,
          actor_id: actorId,
          actor_email: adminUser.email,
          timestamp: report.timestamp,
          charge_id: report.charge_id,
          remote_status: report.remote_status,
          amount_cents: report.remote_amount_cents,
        })

        await updateOrderWorkflow(req.scope).run({
          input: {
            id,
            user_id: actorId,
            metadata: {
              ...metadata,
              manual_payment_audit_trail: trail,
              last_culqi_reconciliation: {
                timestamp: report.timestamp,
                status: report.action_taken,
                charge_id: report.charge_id,
              },
            },
          },
        })
      }
    } catch (auditErr: any) {
      logger.warn(`[CulqiReconciliation] Could not update order audit trail: ${auditErr.message}`)
    }
  }

  return res.status(200).json({ reconciliation: report })
}
