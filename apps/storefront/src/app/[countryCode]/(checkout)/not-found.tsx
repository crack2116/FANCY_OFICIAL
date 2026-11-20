import type { Metadata } from "next"

import { t } from "@lib/i18n/translations"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: t("error.notFound.title"),
  description: t("error.notFound.description"),
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-fg-base">
        {t("error.notFound.title")}
      </h1>
      <p className="text-sm text-fg-base">{t("error.notFound.description")}</p>
      <InteractiveLink href="/store">
        {t("empty.state.browseStore")}
      </InteractiveLink>
    </div>
  )
}