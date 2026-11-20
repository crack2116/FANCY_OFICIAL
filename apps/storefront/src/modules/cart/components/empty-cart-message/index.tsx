import { t } from "@lib/i18n/translations"
import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="rounded-2xl border border-[#E7E5DF] bg-white px-6 py-16 sm:py-24 shadow-xs flex flex-col justify-center items-center text-center"
      data-testid="empty-cart-message"
    >
      <Heading
        level="h1"
        className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F352E]"
      >
        {t("cart.empty")}
      </Heading>
      <Text className="text-base text-[#4B5563] mt-3 mb-7 max-w-[32rem]">
        {t("cart.emptyHint")}
      </Text>
      <div>
        <InteractiveLink href="/store">{t("cart.explore")}</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
