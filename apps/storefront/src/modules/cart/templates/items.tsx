import { t } from "@lib/i18n/translations"
import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items
  const totalCount =
    items?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) ?? 0

  return (
    <div>
      <div className="pb-4 mb-2 flex items-center justify-between gap-3 border-b border-[#EFECE6]">
        <Heading className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-[#0F352E]">
          {t("cart.title")}
        </Heading>
        {totalCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-[#FAF8F4] border border-[#E7E5DF] px-3 py-1 text-xs font-semibold text-[#0F352E]">
            {totalCount === 1
              ? t("cart.itemCountSingle", { count: totalCount })
              : t("cart.itemCountPlural", { count: totalCount })}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <Table.Header className="border-t-0">
            <Table.Row className="text-[#6B7280] text-[11px] sm:text-xs uppercase tracking-wider">
              <Table.HeaderCell className="!pl-0 !pr-1.5 small:!px-4">{t("cart.item")}</Table.HeaderCell>
              <Table.HeaderCell className="!px-1.5 small:!px-4"></Table.HeaderCell>
              <Table.HeaderCell className="!px-1.5 small:!px-4">{t("product.quantity")}</Table.HeaderCell>
              <Table.HeaderCell className="hidden small:table-cell">{t("cart.price")}</Table.HeaderCell>
              <Table.HeaderCell className="!pr-0 !pl-1.5 small:!px-4 text-right">{t("cart.total")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items
              ? [...items]
                  .sort((a, b) => {
                    return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                  })
                  .map((item) => {
                    return (
                      <Item
                        key={item.id}
                        item={item}
                        currencyCode={cart?.currency_code}
                      />
                    )
                  })
              : repeat(5).map((i) => {
                  return <SkeletonLineItem key={i} />
                })}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}

export default ItemsTemplate
