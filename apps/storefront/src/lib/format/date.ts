/**
 * Date formatting for shopper-visible surfaces.
 *
 * One implementation, `formatEsPeDate`, so no screen can invent its own format.
 * The storefront locale is es-PE, which means a date reads
 * "5 de octubre de 2026". The ambiguous numeric form ("10/5/26") is never
 * produced: in Spanish Peru a shopper reads `dd/mm` there, in the US `mm/dd`,
 * and a bare "10/5/26" is genuinely ambiguous.
 *
 * `Date#toDateString()` is not used anywhere on /account: it follows the
 * runtime's locale, so it rendered English weekday/month names ("Mon Oct 05
 * 2026") on a Spanish page.
 *
 * An unparseable value returns `null` instead of "Invalid Date", so a caller
 * can decide to omit the row rather than print a lie.
 */

import { siteConfig } from "@lib/site-config"

/**
 * Format a timestamp for display in es-PE.
 *
 * @param value ISO string, epoch milliseconds, or a `Date`.
 * @returns e.g. "5 de octubre de 2026", or `null` when the value is unusable.
 */
export function formatEsPeDate(value: string | number | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  // `es-PE` in modern ICU formats the day-of-month first ("5 de octubre de
  // 2026"), which is what the shop's copy is written in.
  return new Intl.DateTimeFormat(siteConfig.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

/**
 * Format a timestamp as date and time in es-PE, used where a shopper needs to
 * tell two events apart (for example a payment record).
 */
export function formatEsPeDateTime(
  value: string | number | Date | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(siteConfig.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}