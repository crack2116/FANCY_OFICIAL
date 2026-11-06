import { useState } from "react"

interface Delivery {
  id: string
  status: "received" | "preparation" | "in-transit" | "delivered" | "cancelled"
  customer: string
  address: string
  pet: string
  eta?: string
}

/** Componente de seguimiento de entregas - datos ficticios */
export function DeliveryTracker({ deliveries }: { deliveries: Delivery[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")

  const statusLabels: Record<string, string> = {
    received: "Recibido",
    preparation: "En preparación",
    "in-transit": "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  }

  const statusOptions = [
    { value: "received", label: "Recibido" },
    { value: "preparation", label: "En preparación" },
    { value: "in-transit", label: "En camino" },
    { value: "delivered", label: "Entregado" },
    { value: "cancelled", label: "Cancelado" },
  ]

  return (
    <div>
      <h2 className="text-ui-fg-base text-lg font-medium mb-4">
        Delivery tracking
      </h2>

      <div className="space-y-3">
        {deliveries.map((del) => (
          <div
            key={del.id}
            className="p-4 rounded-lg border bg-white shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">{del.customer}</span>
                <span className="text-xs text-ui-fg-muted">{del.pet}</span>
              </div>
              <span className="text-sm font-medium {
                del.status === "delivered"
                  ? "text-positive"
                  : del.status === "in-transit"
                  ? "text-info"
                  : del.status === "cancelled"
                  ? "text-danger"
                  : "text-warning"
              }">
                {statusLabels[del.status]}
              </span>
            </div>
            <p className="text-sm text-ui-fg-subtle mt-1">
              {del.address} {del.eta ? `· ETA: ${del.eta}` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <select
                className="py-1 px-2 rounded border border-[var(--border-subtle)] text-sm"
                onChange={(e =>
                  setEditing((prev) =>
                    prev === del.id ? null : del.id
                  ))
                }
                defaultValue={del.status}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setEditing(del.id)}
                className="py-1 px-2 text-xs rounded border border-[var(--border-subtle)] hover:bg-brand-50 transition-colors"
                aria-label="Update status"
              >
                Update
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick update form */}
      {editing && (
        <div className="mt-6 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-cream)]">
          <h3 className="text-ui-fg-base text-sm font-medium mb-3">
            Update status
          </h3>
          <select
            className="w-full py-2 rounded-md border border-[var(--border-subtle)] px-3 text-sm"
            onChange={(e => setNewStatus(e.target.value))}
            defaultValue={editing}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setNewStatus("")
              }}
              className="py-1 px-2 rounded border border-[var(--border-subtle)] hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setNewStatus("")
                alert("Status updated (ficticious)")
              }}
              className="py-1 px-2 rounded border border-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
