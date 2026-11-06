"use client"

import React, { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { Button, Text } from "@modules/common/components/ui"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { publicErrorMessage } from "@lib/errors/public-error"
import ErrorMessage from "../error-message"

declare global {
  interface Window {
    Culqi?: {
      publicKey: string
      settings: (config: {
        title: string
        currency: string
        amount: number
        description?: string
        order?: string
      }) => void
      options: (opts: {
        lang?: string
        installments?: boolean
        modal?: boolean
        style?: Record<string, unknown>
      }) => void
      open: () => void
      close: () => void
      token?: {
        id: string
        email: string
        card_number?: string
      }
      order?: {
        id: string
      }
      error?: {
        user_message?: string
        merchant_message?: string
        code?: string
      }
    }
    culqi?: () => void
  }
}

type CulqiPaymentButtonProps = {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}

export const CulqiPaymentButton: React.FC<CulqiPaymentButtonProps> = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || ""
  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  useEffect(() => {
    // Dynamically load Culqi Checkout v4 script
    const existingScript = document.getElementById("culqi-checkout-script")
    if (existingScript) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.id = "culqi-checkout-script"
    script.src = "https://checkout.culqi.com/js/v4"
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      setErrorMessage("No se pudo cargar la pasarela de pagos Culqi. Verifique su conexión.")
    }
    document.body.appendChild(script)
  }, [])

  const handlePayment = async () => {
    setErrorMessage(null)

    if (!publicKey) {
      setErrorMessage(
        "Culqi no está configurado (falta NEXT_PUBLIC_CULQI_PUBLIC_KEY). La pasarela está en espera de credenciales oficiales."
      )
      return
    }

    if (!window.Culqi) {
      setErrorMessage("La biblioteca Culqi Checkout aún no se ha cargado. Reintente en un momento.")
      return
    }

    // The Culqi modal must receive céntimos. The authoritative amount is the
    // integer céntimos the SERVER scaled when the payment session was created/
    // updated (payment_session.data.amount written by the backend provider).
    // Trusting the server-side amount keeps the modal in sync with the charge
    // the backend will actually authorize; an absent/stale session value falls
    // back to cart.total * 100 (cart.total is Medusa MAJOR units, so the old
    // Math.round(total) path opened a 100x-too-small modal, e.g. S/ 79.90 ->
    // 80 céntimos).
    const sessionAmount = Number(
      (paymentSession?.data as { amount?: unknown } | null)?.amount
    )
    const amountInCentimos =
      Number.isSafeInteger(sessionAmount) && sessionAmount > 0
        ? sessionAmount
        : Math.round(Number(cart.total || 0) * 100)

    if (amountInCentimos <= 0) {
      setErrorMessage("El importe del carrito no es válido para procesar el pago.")
      return
    }

    setSubmitting(true)

    try {
      window.Culqi.publicKey = publicKey
      window.Culqi.settings({
        title: "FancyPets / FancyPeru",
        currency: "PEN",
        amount: amountInCentimos,
        description: `Pedido ${cart.id ? cart.id.slice(-6) : ""}`,
      })

      window.Culqi.options({
        lang: "es",
        installments: false,
      })

      window.culqi = async () => {
        if (window.Culqi?.token) {
          const token = window.Culqi.token
          window.Culqi.close()

          try {
            // Send client token to Medusa payment session
            if (paymentSession?.provider_id) {
              await initiatePaymentSession(cart, {
                provider_id: paymentSession.provider_id,
                data: {
                  token_id: token.id,
                  source_id: token.id,
                  email: token.email,
                },
              })
            }

            // Complete Medusa order
            await placeOrder()
          } catch (err: unknown) {
            setErrorMessage(publicErrorMessage(err, "Error al confirmar el pedido tras el cobro."))
            setSubmitting(false)
          }
        } else if (window.Culqi?.error) {
          const err = window.Culqi.error
          const msg =
            err.user_message ||
            err.merchant_message ||
            "Operación rechazada o cancelada por el usuario."
          setErrorMessage(msg)
          setSubmitting(false)
        } else {
          setSubmitting(false)
        }
      }

      window.Culqi.open()
    } catch (err: unknown) {
      setErrorMessage(publicErrorMessage(err, "Error al iniciar el checkout de Culqi."))
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={notReady || submitting || !scriptLoaded}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId || "submit-culqi-payment-button"}
        className="w-full bg-[#00A79D] hover:bg-[#008f86] text-white"
      >
        {!publicKey ? "Culqi (Pendiente de Credenciales)" : "Pagar con Culqi (Tarjeta)"}
      </Button>

      {!publicKey && (
        <Text className="txt-small text-ui-fg-subtle mt-2">
          La integración técnica está lista. Se activará cuando el cliente suministre sus credenciales.
        </Text>
      )}

      <ErrorMessage error={errorMessage} data-testid="culqi-payment-error-message" />
    </>
  )
}

export default CulqiPaymentButton
