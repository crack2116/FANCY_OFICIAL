"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import DeleteButton from "@modules/common/components/delete-button"
import Cart from "@modules/common/icons/cart"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)
  const hoverOpenedAtRef = useRef(0)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()
    const timer = setTimeout(close, 5000)
    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }
    if (!cartDropdownOpen) {
      hoverOpenedAtRef.current = Date.now()
    }
    open()
  }

  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    itemRef.current = totalItems
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, pathname])

  const sortedItems = cartState?.items
    ? [...cartState.items].sort((a, b) =>
        (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
      )
    : []

  return (
    <div
      className="relative z-50 h-full"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton
          type="button"
          onClick={() => {
            if (Date.now() - hoverOpenedAtRef.current < 450) {
              open()
              return
            }
            setCartDropdownOpen((prev) => !prev)
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#1A1A1A] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={t("header.cartWithCount", { count: totalItems })}
          aria-expanded={cartDropdownOpen}
          data-testid="nav-cart-button"
        >
          <Cart size="22" />
          <span
            data-testid="cart-count-badge"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F36F21] px-1 text-[10px] font-bold leading-none text-white shadow-sm"
          >
            {totalItems}
          </span>
        </PopoverButton>

        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[420px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white text-fg-base shadow-[0_20px_48px_rgba(15,53,46,0.16)]"
            data-testid="nav-cart-dropdown"
          >
            <div className="flex items-center justify-between border-b border-[#EFECE6] bg-[#FCFBF8] px-5 py-3.5">
              <h3 className="text-sm font-bold text-[#0F352E]">
                {t("cart.title")}
              </h3>
              <span className="rounded-full bg-[#FFF4EC] px-2.5 py-0.5 text-xs font-semibold text-[#C8530E]">
                {t(
                  totalItems === 1
                    ? "cart.itemCountSingle"
                    : "cart.itemCountPlural",
                  { count: totalItems }
                )}
              </span>
            </div>

            {sortedItems.length > 0 && cartState ? (
              <>
                <div className="max-h-[380px] divide-y divide-[#F2EFEA] overflow-y-auto px-5 no-scrollbar">
                  {sortedItems.map((item) => (
                    <div
                      className="flex items-start gap-3.5 py-4"
                      key={item.id}
                      data-testid="cart-item"
                    >
                      <LocalizedClientLink
                        href={`/products/${item.product_handle}`}
                        onClick={close}
                        className="w-20 shrink-0 overflow-hidden rounded-xl border border-[#EFECE6] bg-white p-1"
                      >
                        <Thumbnail
                          thumbnail={item.thumbnail}
                          images={item.variant?.product?.images}
                          size="square"
                        />
                      </LocalizedClientLink>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#0F352E] line-clamp-2">
                            <LocalizedClientLink
                              href={`/products/${item.product_handle}`}
                              onClick={close}
                              className="transition-colors hover:text-[#F36F21]"
                              data-testid="product-link"
                            >
                              {item.title}
                            </LocalizedClientLink>
                          </h4>

                          <div className="shrink-0 pl-1">
                            <LineItemPrice
                              item={item}
                              style="tight"
                              currencyCode={cartState.currency_code}
                            />
                          </div>
                        </div>

                        <LineItemOptions
                          variant={item.variant}
                          data-testid="cart-item-variant"
                          data-value={item.variant}
                        />

                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span
                            className="inline-flex items-center rounded-md bg-[#F6F4EF] px-2 py-0.5 text-xs font-medium text-fg-base"
                            data-testid="cart-item-quantity"
                            data-value={item.quantity}
                          >
                            {t("product.quantity")}: {item.quantity}
                          </span>

                          <DeleteButton
                            id={item.id}
                            className="text-xs text-fg-muted hover:text-danger-700"
                            data-testid="cart-item-remove-button"
                          >
                            {t("cart.remove")}
                          </DeleteButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-[#EFECE6] bg-[#FCFBF8] px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fg-subtle">
                      {t("cart.subtotal")}
                    </span>
                    <span
                      className="text-lg font-bold tabular-nums text-[#0F352E]"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>

                  <LocalizedClientLink href="/cart" onClick={close} passHref>
                    <Button
                      className="h-11 w-full rounded-xl bg-[#0F352E] font-semibold text-white hover:bg-[#164A40]"
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      {t("cart.goToCart")}
                    </Button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-y-4 px-6 py-12 text-center">
                <span className="text-sm text-fg-subtle">
                  {t("cart.empty")}
                </span>
                <LocalizedClientLink href="/store" onClick={close}>
                  <Button
                    className="rounded-xl bg-[#0F352E] px-5 text-white hover:bg-[#164A40]"
                    onClick={close}
                  >
                    {t("cart.explore")}
                  </Button>
                </LocalizedClientLink>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
