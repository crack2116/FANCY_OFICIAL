/**
 * `POST /admin/orders/:id/authorize-cod`
 *
 * Admin-only endpoint that records an explicit, server-authoritative
 * cash-on-delivery authorization for an order.
 *
 * Security & Integrity:
 * - Requires an authenticated Admin identity (authenticate('user') registered
 *   in src/api/middlewares.ts; Medusa core also gates /admin globally) and
 *   resolves the REAL admin user through the User module: a valid /admin JWT
 *   whose actor no longer exists (or never existed) cannot authorize, because
 *   permissions are effective, not path-declared.
 * - Optional allowlist env `COD_AUTHORIZED_ADMIN_EMAILS`: when defined and
 *   non-empty (comma-separated, case-insensitive), only listed admin emails
 *   may authorize. When the variable is undefined, any authenticated admin
 *   keeps the previous behavior.
 * - Canceled orders can NEVER be enabled: authorization is refused with
 *   NOT_ALLOWED regardless of their payment state.
 * - Writes
 *   `order.metadata.fancyperu_cod = { order_id, authorized_by, authorized_at,
 *   status, authorized_signature }`, where `authorized_signature` is an
 *   HMAC-SHA256 over `order_id|authorized_by|authorized_at|status` computed
 *   with the server secret (src/lib/cod-authorization.ts). The fulfillment
 *   gate (src/lib/fulfillment-authorization.ts) accepts COD ONLY when this
 *   signature verifies, so buyer-random cart metadata can never forge it.
 * - Idempotent by rejection: a second authorization of an order whose marker
 *   already verifies is a NOT_ALLOWED error instead of clobbering the audit
 *   trail. A PRE-EXISTING marker WITHOUT a verifiable signature (buyer
 *   injection or pre-HMAC legacy shape) is OVERWRITTEN by this legitimate
 *   authorization and the remediation is recorded in the audit trail.
 * - Metadata mutation goes through Medusa's `updateOrderWorkflow` so the
 *   update, its order change record and the emitted events stay core-shaped.
 */
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { updateOrderWorkflow } from "@medusajs/medusa/core-flows"
import {
  getServerSecret,
  signCodAuthorization,
  verifyCodAuthorization,
} from "../../../../../lib/cod-authorization"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = req.body as { notes?: string }
  const serverSecret = getServerSecret()

  const actorId = req.auth_context?.actor_id
  if (!actorId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Cash-on-delivery authorization requires an authenticated admin identity."
    )
  }

  // Resolve the effective admin user: the request may be authenticated for
  // the /admin namespace while the underlying actor record is gone.
  const userService = req.scope.resolve(Modules.USER)
  let adminUser
  try {
    adminUser = await userService.retrieveUser(actorId)
  } catch {
    adminUser = undefined
  }
  if (!adminUser) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      `Admin identity "${actorId}" could not be resolved to an existing user.`
    )
  }
  const adminEmail = typeof adminUser.email === "string" ? adminUser.email : ""

  const allowlistRaw = process.env.COD_AUTHORIZED_ADMIN_EMAILS
  const allowlist =
    typeof allowlistRaw === "string" && allowlistRaw.trim() !== ""
      ? allowlistRaw
          .split(",")
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => entry !== "")
      : []
  if (allowlist.length > 0) {
    const normalizedEmail = adminEmail.trim().toLowerCase()
    if (!normalizedEmail || !allowlist.includes(normalizedEmail)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This admin is not on the cash-on-delivery authorization allowlist."
      )
    }
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status", "metadata", "payment_collections.status"],
    filters: { id },
  })

  const order = orders?.[0]
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id "${id}" not found.`)
  }

  if (String(order.status) === "canceled") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Order "${id}" is canceled; cash-on-delivery can never be enabled for a canceled order.`
    )
  }

  const currentMeta = (order.metadata as Record<string, unknown>) || {}

  // Idempotency: a marker that ALREADY verifies (same HMAC scheme, same
  // secret) means an admin signed this order before. Anything else with or
  // without the fancyperu_cod key - most notably the buyer-injected shape -
  // fails verification and is remediated by this write.
  const serverVerification = verifyCodAuthorization(currentMeta, id, serverSecret)
  if (serverVerification.valid) {
    const existingCod = currentMeta.fancyperu_cod as { authorized_by?: unknown } | undefined
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cash-on-delivery for order "${id}" is already authorized (authorized by ${String(
        existingCod?.authorized_by ?? "an admin"
      )}).`
    )
  }
  const hadUnverifiableMarker = currentMeta.fancyperu_cod !== undefined

  const authorizedAt = new Date().toISOString()
  const authorizedBy = adminEmail.trim() !== "" ? adminEmail.trim() : actorId
  const authorizedSignature = signCodAuthorization(
    {
      order_id: id,
      authorized_by: authorizedBy,
      authorized_at: authorizedAt,
      status: "authorized",
    },
    serverSecret
  )

  const auditEntry = {
    action: "cod_authorized",
    actor_id: actorId,
    timestamp: authorizedAt,
    notes:
      (body?.notes?.trim() || "Cash-on-delivery authorized before dispatch") +
      (hadUnverifiableMarker
        ? " A previously stored fancyperu_cod marker without a verifiable server signature was replaced by this signed authorization."
        : ""),
  }

  const updatedMetadata = {
    ...currentMeta,
    fancyperu_cod: {
      order_id: id,
      authorized_by: authorizedBy,
      authorized_at: authorizedAt,
      status: "authorized",
      authorized_signature: authorizedSignature,
    },
    manual_payment_audit_trail: [
      ...((currentMeta.manual_payment_audit_trail as unknown[]) || []),
      auditEntry,
    ],
  }

  await updateOrderWorkflow(req.scope).run({
    input: {
      id,
      user_id: actorId,
      metadata: updatedMetadata,
    },
  })

  return res.status(200).json({
    success: true,
    message: `Cash-on-delivery authorization recorded for order ${id}.`,
    order_id: order.id,
    cod: {
      authorized_by: authorizedBy,
      authorized_at: authorizedAt,
      status: "authorized",
    },
  })
}
