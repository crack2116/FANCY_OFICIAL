import { z } from '@medusajs/framework/zod'

/**
 * Phone number as the storefront collects it.
 *
 * DELIBERATELY PERMISSIVE
 * Peru has no single fixed phone format: landlines with and without a leading
 * `0`/`1`, mobiles with or without `+51`, extension markers, and landlines that
 * carry a district code (e.g. `(01) 123-4567` for Lima). A strict regex would
 * reject numbers that genuinely work and would teach the shopper that the form
 * is broken.
 *
 * So this only rejects what is DEFINITELY not a phone number: empty values and
 * anything containing letters. Digits, `+`, spaces, dashes, dots and
 * parentheses are accepted, and the result must still contain at least 7 digits
 * so a single stray character cannot pass.
 */
const PHONE_PATTERN = /^[0-9+()\-.\s]+$/
const MIN_PHONE_DIGITS = 7

/**
 * A name that is present must contain something.
 *
 * The storefront trims before sending, so a name of only whitespace reaches the
 * API as `""` or `"   "`. Both are rejected here rather than stored as a blank
 * name that the account dashboard would then have to special-case.
 */
const nameField = z
  .string()
  .trim()
  .min(1, { message: 'The name cannot be empty.' })
  .max(100, { message: 'The name is too long.' })

/**
 * Body of `POST /store/customers/me`.
 *
 * Every field is `.nullish()` so a partial update still works: the profile form
 * can send `phone` alone. What this adds over Medusa's core schema is that a
 * field which IS present has to be valid.
 *
 * Deliberately absent:
 *   - `email`   the core `StoreUpdateCustomer` has no such key, so the account
 *               identity cannot be changed through this route at all.
 *   - `id`      never writable from a store request.
 *   - `metadata` not accepted: it is internal storage, and a shopper must not be
 *               able to write arbitrary keys into it. `.strict()` is what makes
 *               that real - Medusa's core schema silently STRIPS an unknown key,
 *               so without it a `metadata` payload would be dropped rather than
 *               refused and this comment would be a lie.
 *
 * `.strict()` is safe here because exactly one caller in this project POSTs to
 * `/store/customers/me`: the profile form, which sends only the fields above.
 * Login reconciliation goes to `POST /store/customers`, a different route.
 */
export const StoreUpdateCustomerBody = z
  .object({
    first_name: nameField.nullish(),
    last_name: nameField.nullish(),
    company_name: z.string().trim().max(100).nullish(),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => PHONE_PATTERN.test(value) && value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS,
        { message: 'The phone number is not valid.' }
      )
      .nullish(),
  })
  .strict()