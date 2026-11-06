import type { ReactNode } from "react"
import { Children, isValidElement } from "react"

/**
 * Routes in the General settings group that are hidden from store operators.
 *
 * For a domestic store in Peru, multi-region and tax region configurations
 * are static and rarely touched by operators. Omitting them from the navigation
 * keeps the settings sidebar focused on daily operations.
 */
export const HIDDEN_GENERAL_ROUTES = new Set([
  "/settings/regions",
  "/settings/tax-regions",
])

export const isTargetRoute = (value?: unknown): boolean =>
  typeof value === "string" &&
  (HIDDEN_GENERAL_ROUTES.has(value) ||
    value.includes("/settings/regions") ||
    value.includes("/settings/tax-regions"))

export const shouldOmitGeneralEntry = (node: ReactNode): boolean => {
  if (!isValidElement(node)) {
    return false
  }

  if (isTargetRoute(node.key)) {
    return true
  }

  const props = node.props as Record<string, unknown> | undefined
  if (!props) {
    return false
  }

  if (isTargetRoute(props.id) || isTargetRoute(props.to)) {
    return true
  }

  if (isValidElement(props.children) && shouldOmitGeneralEntry(props.children)) {
    return true
  }

  if (Array.isArray(props.children)) {
    for (const child of props.children) {
      if (shouldOmitGeneralEntry(child)) {
        return true
      }
    }
  }

  return false
}

export const filterGeneralSection = (node: ReactNode): ReactNode => {
  if (!node) {
    return node
  }
  return Children.map(node, (child) =>
    shouldOmitGeneralEntry(child) ? null : child
  )
}
