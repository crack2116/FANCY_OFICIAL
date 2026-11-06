import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaLinkService } from "../links/link-service"

export default async function productCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id

  try {
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
    const activeChannels = await salesChannelService.listSalesChannels({
      is_disabled: false,
    })

    if (!activeChannels || activeChannels.length === 0) {
      return
    }

    const link = container.resolve<MedusaLinkService>(
      ContainerRegistrationKeys.LINK
    )

    const linksToCreate = activeChannels.map((channel) => ({
      [Modules.PRODUCT]: { product_id: productId },
      [Modules.SALES_CHANNEL]: { sales_channel_id: channel.id },
    }))

    await link.create(linksToCreate)
    console.log(
      `[Auto-Link] Successfully linked product ${productId} to default sales channel(s).`
    )
  } catch (error) {
    console.error(
      `[Auto-Link] Error auto-linking product ${productId} to sales channels:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
}
