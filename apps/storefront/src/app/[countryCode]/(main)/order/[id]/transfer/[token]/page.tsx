import type { Metadata } from "next"

import { t } from "@lib/i18n/translations"
import { Heading, Text } from "@modules/common/components/ui"
import TransferActions from "@modules/order/components/transfer-actions"
import TransferImage from "@modules/order/components/transfer-image"

export const metadata: Metadata = {
  title: t("order.transfer.request.title"),
  description: t("order.transfer.request.description"),
  robots: { index: false, follow: false },
}

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  return (
    <div className="mx-auto mt-10 mb-20 flex w-full max-w-xl flex-col items-start gap-y-4">
      <TransferImage />

      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-fg-base">
          {t("order.transfer.request.heading", { id })}
        </Heading>

        <Text className="text-fg-subtle">
          {t("order.transfer.request.body", { id })}
        </Text>

        <div className="h-px w-full bg-[var(--border-subtle)]" />

        <Text className="text-fg-subtle">
          {t("order.transfer.request.consequence")}
        </Text>

        <Text className="text-fg-subtle">
          {t("order.transfer.request.declineHint")}
        </Text>

        <div className="h-px w-full bg-[var(--border-subtle)]" />

        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}