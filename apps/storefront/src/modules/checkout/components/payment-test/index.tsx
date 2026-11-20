import { t } from "@lib/i18n/translations"
import { Badge } from "@modules/common/components/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  return (
    <Badge color="orange" className={className}>
      {t("checkout.payment.test")}
    </Badge>
  )
}

export default PaymentTest
