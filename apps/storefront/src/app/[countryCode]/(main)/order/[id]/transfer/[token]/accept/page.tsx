import { acceptTransferRequest } from "@lib/data/orders"
import { t } from "@lib/i18n/translations"
import { Heading, Text } from "@modules/common/components/ui"
import TransferImage from "@modules/order/components/transfer-image"

/**
 * Order-transfer acceptance.
 *
 * The backend's `error` is deliberately NOT rendered. It is a Medusa message and
 * can carry internal detail (ids, field names, a stack) that a shopper cannot act
 * on and should not read. The shopper gets a sentence and a way to retry.
 */
export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  const { success } = await acceptTransferRequest(id, token)

  return (
    <div className="mx-auto mt-10 mb-20 flex w-full max-w-xl flex-col items-start gap-y-4">
      <TransferImage />

      <div className="flex flex-col gap-y-6">
        {success ? (
          <>
            <Heading level="h1" className="text-xl text-fg-base">
              {t("order.transfer.accepted.title")}
            </Heading>
            <Text className="text-fg-subtle">
              {t("order.transfer.accepted.description", { id })}
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