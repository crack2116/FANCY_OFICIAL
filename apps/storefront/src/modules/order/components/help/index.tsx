/**
 * Closing help block.
 *
 * The upstream version linked to `/contact` and labelled a second link
 * "Returns & Exchanges" pointing at the same page. This build has neither a
 * contact route nor a returns policy, so both links are gone: a link to a 404,
 * or to a policy the shop does not have, is worse than an honest sentence.
 */

import { t } from "@lib/i18n/translations"
import { Heading } from "@modules/common/components/ui"

const Help = () => {
  return (
    <div className="mt-2">
      <Heading className="text-base-semi">{t("account.help.title")}</Heading>
      <p className="text-base-regular my-2 max-w-prose">{t("account.help.body")}</p>
    </div>
  )
}

export default Help