/**
 * `LOW_STOCK_THRESHOLD` lives in `stock.ts` for the same reason: one number, one
 * home, never re-typed at a call site.
 */

/**
 * Default page size for the shopper's order history.
 *
 * WHY IT CANNOT LIVE IN `lib/data/orders.ts`
 * That module is a `"use server"` file, and Next.js allows ONLY async functions
 * to be exported from one. A plain `export const ORDERS_PAGE_SIZE = 10` there
 * fails the build with
 *
 *   "Only async functions are allowed to be exported in a 'use server' file"
 *
 * which surfaced as a hard 500 on `/pe/account` and `/pe/account/orders`, not as
 * a compile error you would expect. Keeping the constant in this plain module is
 * what lets the account order page import it.
 */
export const ORDERS_PAGE_SIZE = 10