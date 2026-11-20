import { t } from "@lib/i18n/translations"
import { Button, Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="rounded-2xl border border-[#E7E5DF] bg-white px-5 py-4 sm:px-7 sm:py-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <Heading level="h2" className="text-lg sm:text-xl font-bold text-[#0F352E]">
          {t("cart.signIn.title")}
        </Heading>
        <Text className="text-sm text-[#4B5563] mt-1">
          {t("cart.signIn.body")}
        </Text>
      </div>
      <div className="shrink-0">
        <LocalizedClientLink href="/account">
          <Button
            variant="secondary"
            className="h-10 rounded-xl border-[#D6D3CB] px-5 font-semibold text-[#0F352E] hover:bg-[#FAF8F4]"
            data-testid="sign-in-button"
          >
            {t("cart.signIn.cta")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
