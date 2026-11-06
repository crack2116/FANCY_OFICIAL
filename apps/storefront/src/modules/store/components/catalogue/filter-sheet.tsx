"use client"

import { Dialog, Transition } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { Fragment, type ReactNode } from "react"

import { t } from "@lib/i18n/translations"

/**
 * The mobile filter sheet.
 *
 * A Headless UI `Dialog`, which is what supplies the accessibility contract the
 * brief asks for: focus moves into the panel on open, focus is trapped while it
 * is open, Escape closes it, and focus returns to the trigger that opened it.
 * None of that is hand-rolled here — reimplementing a focus trap is how a drawer
 * ends up unreachable by keyboard.
 *
 * It is a sheet from the bottom because the filter groups are stacked, and it is
 * mounted only while open so the filter controls do not exist twice in the
 * accessibility tree.
 */
export default function FilterSheet({
  isOpen,
  close,
  title,
  children,
}: {
  isOpen: boolean
  close: () => void
  title: string
  children: ReactNode
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-fg-base/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <Dialog.Panel
                className="pointer-events-auto flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-large border-t border-[var(--border-subtle)] bg-surface shadow-[var(--elevation-modal)]"
                data-testid="filter-sheet"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
                  <Dialog.Title className="text-base font-semibold text-fg-base">
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t("catalogue.filters.close")}
                    className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-subtle hover:text-fg-base"
                    data-testid="close-filter-sheet"
                  >
                    <XMark />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}