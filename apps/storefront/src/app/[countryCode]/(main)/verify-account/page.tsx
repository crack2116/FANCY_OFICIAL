import type { Metadata } from "next"
import { Suspense } from "react"

import { t } from "@lib/i18n/translations"
import VerifyAccount from "@modules/account/components/verify-account"

export const metadata: Metadata = {
  title: t("account.verify.title"),
  description: t("account.verify.description"),
  robots: { index: false, follow: false },
}

export default function VerifyAccountPage() {
  return (
    <div className="flex w-full justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-fg-base">
            {t("common.loading")}
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}