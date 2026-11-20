"use client"

/**
 * Medusa's first-run onboarding banner, shown only while the `_medusa_onboarding`
 * cookie is set.
 *
 * The upstream copy ("Your test order was successfully created! 🎉") is English
 * and, more importantly, describes Medusa's own starter demo. This build runs a
 * real Peru region with a real catalogue, so the banner only says what is true
 * here: the store is not finished yet.
 */

import { resetOnboardingState } from "@lib/data/onboarding"
import { t } from "@lib/i18n/translations"
import { Button, Container, Text } from "@modules/common/components/ui"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full">
      <div className="flex flex-col gap-y-4 center p-4 md:items-center">
        <Text className="text-ui-fg-base text-xl">{t("onboarding.title")}</Text>
        <Text className="text-ui-fg-subtle text-small-regular">{t("onboarding.body")}</Text>
        <Button
          className="w-fit"
          size="large"
          onClick={() => resetOnboardingState(orderId)}
        >
          {t("onboarding.action")}
        </Button>
      </div>
    </Container>
  )
}

export default OnboardingCta