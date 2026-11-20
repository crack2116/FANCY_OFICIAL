import type { Metadata } from "next"

import { retrieveOrder } from "@lib/data/orders"
import { t } from "@lib/i18n/translations"
import { notFound } from "next/navigation"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: t("order.confirmed.title"),
  description: t("order.confirmed.description"),
  robots: { index: false, follow: false },
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return <OrderCompletedTemplate order={order} />
}