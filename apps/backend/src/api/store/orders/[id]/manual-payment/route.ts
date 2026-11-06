/**
 * `POST /store/orders/:id/manual-payment`
 * `GET /store/orders/:id/manual-payment`
 *
 * Secure endpoint for customers to submit their manual transaction reference
 * (Yape / Plin / Transferencia bancaria).
 *
 * Security:
 * - If customer is authenticated, order must belong to `actor_id`.
 * - If guest, customer must supply `email` matching `order.email`.
 * - Cannot submit or overwrite reference if payment is already `captured`.
 * - Emits audit trail in `order.metadata`.
 */
import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PaymentCollectionStatus,
} from "@medusajs/framework/utils"
import type { IOrderModuleService } from "@medusajs/framework/types"
import { verifyOrderToken } from "../../../../../lib/order-token"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "email", "customer_id", "created_at", "metadata", "payment_collections.status"],
    filters: { id },
  })

  const order = orders?.[0] as {
    id: string
    email?: string | null
    customer_id?: string | null
    created_at?: string
    metadata?: Record<string, unknown> | null
    payment_collections?: { status: string }[]
  } | undefined

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id "${id}" not found.`)
  }

  // Access check
  const actorId = (req as AuthenticatedMedusaRequest).auth_context?.actor_id
  if (actorId) {
    if (order.customer_id && order.customer_id !== actorId) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id "${id}" not found.`)
    }
  } else {
    // Guest access: requires cryptographic proof of possession token
    const token =
      (req.headers["x-order-token"] as string | undefined) ||
      (req.query?.token as string | undefined)
    const isValid = verifyOrderToken(order.id, order.email || "", order.created_at, token)
    if (!isValid) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order with id "${id}" not found or invalid access token.`
      )
    }
  }

  const meta = (order.metadata as Record<string, unknown>) || {}

  res.json({
    order_id: order.id,
    payment_collection_status: order.payment_collections?.[0]?.status || "awaiting",
    manual_payment_status: meta.manual_payment_status || "awaiting_submission",
    manual_payment_reference: meta.manual_payment_reference || null,
    manual_payment_method: meta.manual_payment_method || null,
    manual_payment_submitted_at: meta.manual_payment_submitted_at || null,
    manual_payment_notes: meta.manual_payment_notes || null,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = req.body as {
    reference?: string
    payment_method?: string
    notes?: string
    email?: string
    token?: string
  }

  const reference = body?.reference?.trim()
  if (!reference || reference.length < 3) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A valid transaction reference number (min 3 characters) is required."
    )
  }

  const paymentMethod = body?.payment_method?.trim() || "transferencia"
  const allowedMethods = ["yape", "plin", "transferencia", "bcp", "bbva", "manual"]
  if (!allowedMethods.includes(paymentMethod.toLowerCase())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid payment method. Allowed: ${allowedMethods.join(", ")}.`
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "customer_id",
      "created_at",
      "metadata",
      "payment_collections.status",
      "payment_collections.payments.id",
      "payment_collections.payments.status",
    ],
    filters: { id },
  })

  const order = orders?.[0] as {
    id: string
    email?: string | null
    customer_id?: string | null
    created_at?: string
    metadata?: Record<string, unknown> | null
    payment_collections?: { status: string; payments?: { id: string }[] }[]
  } | undefined

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id "${id}" not found.`)
  }

  // IDOR & Access validation
  const actorId = (req as AuthenticatedMedusaRequest).auth_context?.actor_id
  if (actorId) {
    if (order.customer_id && order.customer_id !== actorId) {
      // 404 rather than 403 to prevent enumeration
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id "${id}" not found.`)
    }
  } else {
    // Guest access: STRICT cryptographic possession token check.
    // Providing only email is strictly prohibited.
    const token =
      (req.headers["x-order-token"] as string | undefined) ||
      body?.token?.trim()
    const isValid = verifyOrderToken(order.id, order.email || "", order.created_at, token)
    if (!isValid) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order with id "${id}" not found or invalid access token.`
      )
    }
  }

  const currentMeta = (order.metadata as Record<string, unknown>) || {}

  // Prevent modifying if already captured
  const paymentCollection = order.payment_collections?.[0]
  if (
    paymentCollection?.status === PaymentCollectionStatus.COMPLETED ||
    (currentMeta.manual_payment_status as string) === "verified_and_captured"
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cannot update reference: This order's payment has already been verified and captured."
    )
  }

  const updatedMetadata = {
    ...currentMeta,
    manual_payment_reference: reference,
    manual_payment_method: paymentMethod.toLowerCase(),
    manual_payment_status: "pending_verification",
    manual_payment_submitted_at: new Date().toISOString(),
    manual_payment_notes: body?.notes ? body.notes.trim() : currentMeta.manual_payment_notes,
    manual_payment_history: [
      ...((currentMeta.manual_payment_history as unknown[]) || []),
      {
        reference,
        payment_method: paymentMethod.toLowerCase(),
        submitted_at: new Date().toISOString(),
        actor: actorId ? `customer:${actorId}` : `guest:${order.email}`,
      },
    ],
  }

  await orderService.updateOrders([
    {
      id: order.id,
      metadata: updatedMetadata,
    },
  ])

  res.status(200).json({
    success: true,
    message: "Comprobante de pago manual registrado. Será verificado por el área de administración.",
    order_id: order.id,
    manual_payment_status: "pending_verification",
    reference,
  })
}
