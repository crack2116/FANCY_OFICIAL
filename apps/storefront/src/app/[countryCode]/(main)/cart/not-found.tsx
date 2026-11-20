import type { Metadata } from "next"

import { t } from "@lib/i18n/translations"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: t("error.notFound.title"),
  description: t("error.notFound.description"),
  robots: { index: false, follow: false },
}

/**
 * A cart id that the backend no longer recognises — a cleared database, an expired
 * cookie, a shared link. It is a normal outcome, not a crash, so it gets an
 * explanation and a way forward instead of a stack.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-fg-base">
        {t("error.cartNotFound.title")}
      </h1>
      <p className="max-w-md text-sm text-fg-base">
        {t("error.cartNotFound.description")}
      </p>
      <InteractiveLink href="/store">
        {t("empty.state.browseStore")}
      </InteractiveLink>
    </div>
  )
}