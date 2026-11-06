import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Heading, Text, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"

interface OrderPaymentData {
  id: string
  payment_status: string
  metadata?: {
    manual_payment_reference?: string
    manual_payment_method?: string
    manual_payment_status?: string
    manual_payment_submitted_at?: string
    manual_payment_verified_by?: string
    manual_payment_verified_at?: string
    manual_payment_rejection_reason?: string
    manual_payment_notes?: string
  }
  payment_collections?: Array<{
    id: string
    status: string
    amount: number
  }>
}

const OrderManualPaymentWidget = () => {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderPaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchOrderData = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/admin/orders/${id}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        const json = await res.json()
        setOrder(json.order)
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderData()
  }, [id])

  const meta = order?.metadata || {}
  const reference = meta.manual_payment_reference
  const method = (meta.manual_payment_method || "transferencia").toUpperCase()
  const paymentStatus = meta.manual_payment_status || "awaiting_submission"
  const isCaptured =
    order?.payment_collections?.[0]?.status === "captured" ||
    order?.payment_status === "captured" ||
    paymentStatus === "verified_and_captured"

  const handleAction = async (action: "confirm" | "reject") => {
    if (!id) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/admin/orders/${id}/verify-manual-payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          action === "confirm" ? "Pago Verificado y Capturado" : "Comprobante Rechazado",
          {
            description:
              action === "confirm"
                ? `El pago para la orden #${id} fue capturado exitosamente en Medusa.`
                : `Se registró el rechazo del comprobante.`,
          }
        )
        await fetchOrderData()
      } else {
        toast.error("Error al procesar el pago", {
          description: data.message || "No se pudo actualizar el estado de pago.",
        })
      }
    } catch (err: unknown) {
      toast.error("Error de comunicación", {
        description: err instanceof Error ? err.message : "Error inesperado.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4 flex flex-col gap-y-3">
      <div className="flex items-center justify-between border-b border-ui-border-base pb-2">
        <Heading level="h3" className="text-small-semi">
          Verificación de Pago Manual (Yape / Plin / Bancos)
        </Heading>
        {isCaptured ? (
          <Badge color="green">Capturado & Verificado</Badge>
        ) : paymentStatus === "rejected" ? (
          <Badge color="red">Rechazado</Badge>
        ) : reference ? (
          <Badge color="orange">Pendiente de Verificación</Badge>
        ) : (
          <Badge color="grey">Sin Comprobante</Badge>
        )}
      </div>

      <div className="flex flex-col gap-y-2 text-small">
        <div className="flex justify-between">
          <Text className="text-ui-fg-subtle">Método de Pago:</Text>
          <Text className="font-medium text-ui-fg-base">{method}</Text>
        </div>

        <div className="flex justify-between">
          <Text className="text-ui-fg-subtle">Nº de Operación / Referencia:</Text>
          <Text className="font-mono font-medium text-ui-fg-base">
            {reference || "El cliente aún no registró su voucher"}
          </Text>
        </div>

        {meta.manual_payment_submitted_at && (
          <div className="flex justify-between">
            <Text className="text-ui-fg-subtle">Registrado el:</Text>
            <Text className="text-ui-fg-muted">
              {new Date(meta.manual_payment_submitted_at).toLocaleString("es-PE")}
            </Text>
          </div>
        )}

        {meta.manual_payment_verified_by && (
          <div className="flex flex-col gap-y-0.5 bg-ui-bg-base p-2 rounded border border-ui-border-subtle mt-1">
            <Text className="text-ui-fg-subtle text-xsmall">Auditoría de Verificación:</Text>
            <Text className="text-xsmall font-mono text-ui-fg-base">
              Confirmado por: {meta.manual_payment_verified_by}
            </Text>
            {meta.manual_payment_verified_at && (
              <Text className="text-xsmall text-ui-fg-muted">
                Fecha: {new Date(meta.manual_payment_verified_at).toLocaleString("es-PE")}
              </Text>
            )}
          </div>
        )}

        {meta.manual_payment_rejection_reason && (
          <div className="bg-ui-bg-base p-2 rounded border border-ui-tag-red-border text-xsmall text-ui-tag-red-text mt-1">
            Motivo de rechazo: {meta.manual_payment_rejection_reason}
          </div>
        )}
      </div>

      {!isCaptured && (
        <div className="flex items-center gap-x-2 pt-2 border-t border-ui-border-base">
          <Button
            size="small"
            variant="primary"
            disabled={!reference || isSubmitting || isLoading}
            isLoading={isSubmitting}
            onClick={() => handleAction("confirm")}
          >
            Confirmar Ingreso en Cuenta
          </Button>
          <Button
            size="small"
            variant="danger"
            disabled={!reference || isSubmitting || isLoading}
            onClick={() => handleAction("reject")}
          >
            Rechazar
          </Button>
        </div>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderManualPaymentWidget
