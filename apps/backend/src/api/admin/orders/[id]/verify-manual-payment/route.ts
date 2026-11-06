/**
 * `POST /admin/orders/:id/verify-manual-payment`
 *
 * Admin-only endpoint to confirm or reject a manual payment (Yape / Plin / BCP).
 *
 * Security & Integrity:
 * - Requires authenticated Admin identity.
 * - Idempotent: Prevents double captures / duplicate confirmations.
 * - Executes Medusa's official `capturePaymentWorkflow` upon confirmation,
 *   officially moving payment collection status from 'authorized' to 'captured'.
 * - Records an immutable audit log in order.metadata (actor_id, timestamp, action).
 */
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PaymentCollectionStatus,
} from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"
import type { IOrderModuleService } from "@medusajs/framework/types"
import { getServerSecret, signManualPaymentStatus } from "../../../../../lib/cod-authorization"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = req.body as {
    action?: "confirm" | "reject"
    reason?: string
    notes?: string
  }

  const action = body?.action
  if (action !== "confirm" && action !== "reject") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Action must be either "confirm" or "reject".'
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  const actorId = req.auth_context?.actor_id || "admin"

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "metadata",
      "total",
      "payment_collections.id",
      "payment_collections.status",
      "payment_collections.amount",
      "payment_collections.payments.id",
      "payment_collections.payments.status",
      "payment_collections.payments.amount",
    ],
    filters: { id },
  })

  const order = orders?.[0]
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id "${id}" not found.`)
  }

  const currentMeta = (order.metadata as Record<string, unknown>) || {}
  const paymentCollection = order.payment_collections?.[0]

  if (action === "confirm") {
    // Check if already captured to prevent duplicate confirmations
    if (
      paymentCollection?.status === PaymentCollectionStatus.COMPLETED ||
      (currentMeta.manual_payment_status as string) === "verified_and_captured"
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Payment for order "${id}" has already been verified and captured.`
      )
    }

    // Locate the payment record within the payment collection
    const payment = paymentCollection?.payments?.[0]
    if (!payment?.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No payment session/payment found on order "${id}" to capture.`
      )
    }

    // Run Medusa core capture workflow
    await capturePaymentWorkflow(req.scope).run({
      input: {
        payment_id: payment.id,
        captured_by: actorId,
        amount: Number(paymentCollection?.amount ?? order.total),
      },
    })

    const auditEntry = {
      action: "confirmed",
      actor_id: actorId,
      timestamp: new Date().toISOString(),
      reference_checked: currentMeta.manual_payment_reference || "N/A",
      notes: body?.notes?.trim() || "Verificado en cuenta bancaria comercial",
    }

    const updatedMetadata = {
      ...currentMeta,
      manual_payment_status: "verified_and_captured",
      // HMAC bound to this order id and the verified status so the fulfillment
      // gate (src/lib/fulfillment-authorization.ts) can trust this state even
      // when metadata arrived from buyer-writable sources (P0-B closure).
      manual_payment_order_id: order.id,
      manual_payment_signature: signManualPaymentStatus(order.id, getServerSecret()),
      manual_payment_verified_by: actorId,
      manual_payment_verified_at: auditEntry.timestamp,
      manual_payment_audit_trail: [
        ...((currentMeta.manual_payment_audit_trail as unknown[]) || []),
        auditEntry,
      ],
    }

    await orderService.updateOrders([
      {
        id: order.id,
        metadata: updatedMetadata,
      },
    ])

    return res.status(200).json({
      success: true,
      message: `Manual payment confirmed and captured successfully for order ${id}.`,
      order_id: order.id,
      payment_status: "captured",
      verified_by: actorId,
      verified_at: auditEntry.timestamp,
    })
  } else {
    // Action is reject
    const reason = body?.reason?.trim() || "Pago no figura en extracto de cuenta bancaria"

    const auditEntry = {
      action: "rejected",
      actor_id: actorId,
      timestamp: new Date().toISOString(),
      reason,
      notes: body?.notes?.trim() || "",
    }

    const updatedMetadata = {
      ...currentMeta,
      manual_payment_status: "rejected",
      manual_payment_rejection_reason: reason,
      manual_payment_rejected_by: actorId,
      manual_payment_rejected_at: auditEntry.timestamp,
      manual_payment_audit_trail: [
        ...((currentMeta.manual_payment_audit_trail as unknown[]) || []),
        auditEntry,
      ],
    }

    await orderService.updateOrders([
      {
        id: order.id,
        metadata: updatedMetadata,
      },
    ])

    return res.status(200).json({
      success: true,
      message: `Manual payment rejected for order ${id}. Reason: ${reason}.`,
      order_id: order.id,
      manual_payment_status: "rejected",
      rejected_by: actorId,
      rejected_at: auditEntry.timestamp,
    })
  }
}
