import { declineTransferRequest } from "@lib/data/orders"
import { t } from "@lib/i18n/translations"
import { Heading, Text } from "@modules/common/components/ui"
import TransferImage from "@modules/order/components/transfer-image"

/**
 * Order-transfer decline.
 *
 * As with the accept page, the backend's `error` is deliberately not rendered: it
 * can carry internal detail a shopper cannot act on.
 */
export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  const { success } = await declineTransferRequest(id, token)

  return (
    <div className="mx-auto mt-10 mb-20 flex w-full max-w-xl flex-col items-start gap-y-4">
      <TransferImage />

      <div className="flex flex-col gap-y-6">
        {success ? (
          <>
            <Heading level="h1" className="text-xl text-fg-base">
              {t("order.transfer.declined.title")}
            </Heading>
            <Text className="text-fg-subtle">
              {t("order.transfer.declined.description", { id })}
            </Text>
          </>
        ) : (
          <>
            <Heading level="h1" className="text-xl text-fg-base">
              {t("order.transfer.failed.title")}
            </Heading>
            <Text className="text-fg-subtle">
              {t("order.transfer.failed.description")}
            </Text>
          </>
        )}
      </div>
    </div>
  )
}