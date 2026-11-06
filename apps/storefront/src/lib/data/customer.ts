"use server"

import { sdk } from "@lib/config"
import { publicErrorMessage } from "@lib/errors/public-error"
import { t } from "@lib/i18n/translations"
import {
  hasErrors,
  readField,
  validateAddress,
  validateProfile,
  type AddressField,
  type AddressInput,
  type ProfileField,
  type ValidationErrors,
} from "@lib/validation/account"
import { HttpTypes } from "@medusajs/types"
import { FetchError } from "@medusajs/js-sdk"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removeCartId,
  removePendingCustomer,
  setAuthToken,
  setCartId,
  setPendingCustomer,
} from "./cookies"

/**
 * The Peru storefront's country. Used as the default value of the country
 * select, not as a constraint: another region is a data change.
 */
const DEFAULT_COUNTRY_CODE = "pe"

/** Result of a validated address mutation. */
export type AddressActionState = {
  success: boolean
  /** Copy for a whole-form failure. `null` when the failure is per field. */
  error: string | null
  fieldErrors: ValidationErrors<AddressField>
}

/** Result of a profile update. */
export type ProfileActionState = {
  success: boolean
  error: string | null
  fieldErrors: ValidationErrors<ProfileField>
}

/**
 * Read the address form into a flat, always-string shape.
 *
 * `FormData#get` returns `null` for an absent field, so every entry is coerced
 * here once instead of being cast to `string` at twenty call sites — a missing
 * field used to reach Medusa as the literal string "null".
 */
function readAddressForm(formData: FormData): AddressInput {
  return {
    addressName: readField(formData, "address_name"),
    firstName: readField(formData, "first_name"),
    lastName: readField(formData, "last_name"),
    company: readField(formData, "company"),
    address1: readField(formData, "address_1"),
    address2: readField(formData, "address_2"),
    postalCode: readField(formData, "postal_code"),
    city: readField(formData, "city"),
    province: readField(formData, "province"),
    countryCode: readField(formData, "country_code") || DEFAULT_COUNTRY_CODE,
    phone: readField(formData, "phone"),
  }
}

export type CustomerAuthState =
  | { state: "error"; error: string }
  | { state: "verification_required"; email: string }
  | { state: "success" }
  | null

/**
 * Turn a caught error into something a shopper can act on.
 *
 * The auth SDK's message can be a Medusa payload, a status line or an
 * `Error: ...` prefix over internal detail. Rendering it verbatim puts backend
 * internals in front of a customer on the login form, so the raw value is
 * dropped here — at the boundary — rather than in each caller.
 *
 * Classification now lives in the shared public-error layer, which recognises
 * `invalid_credentials` as a stable Medusa error type and maps it to specific
 * copy. `fallback` covers every other failure.
 */
function shopperAuthError(error: unknown, fallback: string): string {
  return publicErrorMessage(error, fallback)
}

// Requests a verification email for the given customer. The request must be
// authenticated with a token tied to the auth identity (the token returned by
// register or by a login that requires verification).
async function requestVerificationEmail(email: string, token: string) {
  await sdk.auth.verification.request(
    {
      entity_id: email,
      entity_type: "email",
    },
    {
      authorization: `Bearer ${token}`,
    }
  )
}

/**
 * The signed-in customer, or `null` when there is no usable session.
 *
 * CACHE POLICY
 * `cache: "no-store"`, never `force-cache`. This response is the shopper's own
 * record (email, name, phone, saved addresses); caching it under a shared tag
 * would let one browser's copy be replayed to another customer. The shared
 * `customers-<cache id>` tag the starter used is keyed on `_medusa_cache_id`,
 * a per-BROWSER cookie, so two accounts used on the same browser shared one
 * entry. Since `getAuthHeaders()` already reads `cookies()` and forces a
 * dynamic render, the Data Cache could not have produced a static page for a
 * signed-in shopper anyway — it could only leak.
 *
 * Fields are requested explicitly: `customer_id`, `has_account`, roles and
 * `metadata` are backend concerns and must not reach the browser.
 */
export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields:
            "id,email,first_name,last_name,phone,company_name,created_at,*addresses",
        },
        headers: { ...authHeaders },
        cache: "no-store",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

/**
 * Update the shopper's own profile.
 *
 * ONLY `first_name`, `last_name` and `phone` are writable here, and that is a
 * backend fact, not a UI choice. Medusa 2.21.2's store validator
 * (`dist/api/store/customers/validators.js`) is
 *
 *   StoreUpdateCustomer = z.object({
 *     company_name, first_name, last_name, phone, metadata
 *   })
 *
 * — there is no `email` key, and the object is neither `.strict()` nor
 * `.passthrough()`. Zod therefore STRIPS an `email` from the body silently: the
 * update succeeds, the email is unchanged, and nothing tells the customer. So
 * the field is read-only here rather than pretending to work.
 *
 * TODO — verified email change flow
 * A real change needs an Auth-module operation (re-verify the new address and
 * update the auth identity), not a customer-profile update. Until an email
 * provider is configured for this build there is nowhere to send the
 * confirmation, so the UI shows a "próximamente" note instead of a form that
 * silently does nothing.
 *
 * `currentEmail` is only read to keep the same validation rules as the visible
 * form. It is never sent to the backend.
 */
export const updateCustomer = async (
  body: HttpTypes.StoreUpdateCustomer,
  currentEmail = ""
): Promise<ProfileActionState> => {
  const firstName = (body.first_name ?? "").toString().trim()
  const lastName = (body.last_name ?? "").toString().trim()
  const phone = (body.phone ?? "").toString().trim()

  const errors = validateProfile({
    firstName,
    lastName,
    phone,
    email: currentEmail,
  })

  if (hasErrors(errors)) {
    return { success: false, error: null, fieldErrors: errors }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.customer.update(
      { first_name: firstName, last_name: lastName, phone: phone || null },
      {},
      headers
    )

    return {
      success: true,
      error: null,
      fieldErrors: {} as ValidationErrors<ProfileField>,
    }
  } catch (error) {
    return {
      success: false,
      error: shopperAuthError(error, t("account.profile.error")),
      fieldErrors: {} as ValidationErrors<ProfileField>,
    }
  }
}

export async function signup(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password,
    })
  } catch (error) {
    const fetchError = error as FetchError
    // An existing identity (for example, an admin user with the same email) is
    // expected and handled: the customer can still log in to link a customer
    // record. Any other error is surfaced.
    if (
      fetchError.statusText !== "Unauthorized" ||
      fetchError.message !== "Identity with email already exists"
    ) {
      return {
        state: "error",
        error: shopperAuthError(error, t("account.register.error.generic")),
      }
    }
  }

  // Persist the extra signup fields. The customer record is created during
  // login, which is deferred until after email verification when the backend
  // requires it.
  await setPendingCustomer(customerForm)

  // Continue by logging in. The login response tells us whether the backend
  // requires email verification — we don't need a storefront-side flag.
  return completeLogin(customerForm.email, password)
}

export async function login(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  return completeLogin(email, password)
}

// Logs the customer in and reconciles the customer record. The behavior is
// driven entirely by the backend's login response, so it works whether or not
// email verification is enabled.
async function completeLogin(
  email: string,
  password: string
): Promise<CustomerAuthState> {
  let result: Awaited<ReturnType<typeof sdk.auth.login>>

  try {
    result = await sdk.auth.login("customer", "emailpass", { email, password })
  } catch (error) {
    return {
      state: "error",
      error: shopperAuthError(error, t("account.login.error.generic")),
    }
  }

  // A `location` is returned by third-party auth providers, which this flow
  // doesn't support.
  if (typeof result === "object" && "location" in result) {
    return {
      state: "error",
      error: t("account.login.error.unsupportedMethod"),
    }
  }

  // The backend requires email verification and the customer hasn't verified
  // yet. Send the verification email and ask them to check their inbox.
  if (
    typeof result === "object" &&
    "verification_required" in result &&
    result.verification_required
  ) {
    try {
      await requestVerificationEmail(email, result.token)
    } catch {
      // Ignore: the customer can resend from the verification page.
    }
    return { state: "verification_required", email }
  }

  if (typeof result !== "string") {
    return {
      state: "error",
      error: t("account.login.error.unsupportedMethod"),
    }
  }

  let token = result

  // The token may not be tied to a customer record yet — right after
  // registration, or after verifying a brand-new account. Ask the backend:
  // `/store/customers/me` rejects tokens without a registered actor, so a
  // failed retrieve means we still need to create the customer, then log in
  // again to obtain a customer-bound token.
  const customerExists = await sdk.store.customer
    .retrieve({}, { authorization: `Bearer ${token}` })
    .then(() => true)
    .catch(() => false)

  if (!customerExists) {
    const pending = await getPendingCustomer()

    try {
      await sdk.store.customer.create(
        {
          email,
          first_name: pending?.first_name,
          last_name: pending?.last_name,
          phone: pending?.phone,
        },
        {},
        { authorization: `Bearer ${token}` }
      )

      token = (await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })) as string
    } catch (error) {
      return {
        state: "error",
        error: shopperAuthError(error, t("account.login.error.generic")),
      }
    }

    await removePendingCustomer()
  }

  await setAuthToken(token)

  try {
    await transferCart()
  } catch (error) {
    // The session is already established; only the guest cart failed to move
    // over. Saying so is more useful than a generic auth failure, and more
    // honest than claiming success.
    return {
      state: "error",
      error: shopperAuthError(error, t("account.login.error.cartTransfer")),
    }
  }

  return { state: "success" }
}

// Confirms a customer's email using the token from the verification link.
//
// The confirm route doesn't require authentication, so this works even when the
// customer opens the link on a different device than the one they signed up on.
//
// This build ships NO email provider, so verification mail can never be sent and
// the backend never answers `verification_required`. The call is kept because it
// costs nothing and stays correct if a provider is added later; the UI hides
// every entry point to it in the meantime.
export async function confirmEmailVerification(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdk.auth.verification.confirm({ code: token })
    return { success: true }
  } catch {
    // A verification link that has already been used, or has expired, is the
    // common case and the shopper can act on it: the raw SDK message is dropped
    // rather than rendered.
    return { success: false, error: t("account.verify.error") }
  }
}

/**
 * End the session and clear everything the browser was holding for it.
 *
 * WHAT IS CLEARED, AND WHY
 * - `sdk.auth.logout()` then `removeAuthToken()`: the backend session and the
 *   `_medusa_jwt` cookie (httpOnly, so nothing in JS ever held it).
 * - `removeCartId()`: the cart the shopper was building. This build
 *   deliberately DISCARDS the cart reference on logout rather than keeping the
 *   guest cart — the upstream starter behaves the same way, and a cart that
 *   survives into the next account on a shared machine would show one shopper's
 *   selections to another. The cart itself is not deleted in Medusa; only the
 *   browser's pointer to it is dropped, so nothing is destroyed server side.
 *
 * No `revalidateTag` is needed: every account read in this file is `no-store`,
 * so there is no cached copy of the departing customer's data to purge. This is
 * also what removed the old cross-user risk of purging a per-browser tag that
 * could not tell two accounts apart.
 */
export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  await removeCartId()

  redirect(`/${countryCode}/account`)
}

/**
 * Hand the guest cart over to the freshly signed-in customer.
 *
 * After a successful transfer the cart id CHANGES: Medusa moves the items onto a
 * customer-scoped cart and issues a new id. Writing it back is therefore
 * mandatory, not an optimisation — without it the browser would keep pointing at
 * the old guest cart and the shopper would see an empty cart after signing in.
 */
export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  const { cart } = await sdk.store.cart.transferCart(cartId, {}, headers)

  if (cart?.id) {
    await setCartId(cart.id)
  }
}

/**
 * Create a saved address for the signed-in customer.
 *
 * The payload uses only the columns a Medusa customer address really has:
 * `address_name`, `first_name`, `last_name`, `company`, `address_1`,
 * `address_2`, `city`, `postal_code`, `province`, `country_code`, `phone`, plus
 * `is_default_billing` / `is_default_shipping`. There is no `district`, no
 * `region` and no single `is_default` column to invent — see
 * `setDefaultCustomerAddress` for how "preferred" is handled.
 *
 * `country_code` defaults to `pe` because this build is the Peru storefront.
 * It is a default, not a restriction: the value still travels in the form, so
 * adding another region later is a data change, not a code change.
 *
 * Validation runs BEFORE the network call (server side) so a shopper with JS
 * disabled, or with a stale bundle, gets the same Spanish field errors as
 * everyone else instead of a generic failure.
 */
export const addCustomerAddress = async (
  _currentState: Record<string, unknown>,
  formData: FormData
): Promise<AddressActionState> => {
  const input = readAddressForm(formData)

  const errors = validateAddress(input)

  if (hasErrors(errors)) {
    return { success: false, error: null, fieldErrors: errors }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(
      {
        address_name: input.addressName || null,
        first_name: input.firstName,
        last_name: input.lastName,
        company: input.company || null,
        address_1: input.address1,
        address_2: input.address2 || null,
        city: input.city,
        postal_code: input.postalCode,
        province: input.province || null,
        country_code: input.countryCode,
        phone: input.phone || null,
        // A shopper's first saved address becomes both defaults, because that is
        // the one they will keep re-using. `createCustomerAddresses` honours
        // these flags, so no client-side bookkeeping is needed for the empty
        // case.
        is_default_billing: true,
        is_default_shipping: true,
      },
      {},
      headers
    )
    .then(() => ({
      success: true,
      error: null,
      fieldErrors: {} as ValidationErrors<AddressField>,
    }))
    .catch((err) => ({
      success: false,
      error: shopperAuthError(err, t("address.error.default")),
      fieldErrors: {} as ValidationErrors<AddressField>,
    }))
}

/**
 * Update a saved address.
 *
 * `country_code` is deliberately NOT sent when the shopper leaves the select on
 * its placeholder: the Medusa validator marks `country_code` as `.strict()` on
 * `AddressPayload`, so an empty string would be a hard 400 rather than "leave it
 * alone".
 */
export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<AddressActionState> => {
  const addressId = readField(formData, "addressId")

  if (!addressId) {
    return {
      success: false,
      error: t("account.address.error.missingId"),
      fieldErrors: {} as ValidationErrors<AddressField>,
    }
  }

  const input = readAddressForm(formData)

  const errors = validateAddress(input)

  if (hasErrors(errors)) {
    return { success: false, error: null, fieldErrors: errors }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(
      addressId,
      {
        address_name: input.addressName || null,
        first_name: input.firstName,
        last_name: input.lastName,
        company: input.company || null,
        address_1: input.address1,
        address_2: input.address2 || null,
        city: input.city,
        postal_code: input.postalCode,
        province: input.province || null,
        country_code: input.countryCode,
        phone: input.phone || null,
      },
      {},
      headers
    )
    .then(() => ({
      success: true,
      error: null,
      fieldErrors: {} as ValidationErrors<AddressField>,
    }))
    .catch((err) => ({
      success: false,
      error: shopperAuthError(err, t("address.error.default")),
      fieldErrors: {} as ValidationErrors<AddressField>,
    }))
}

/**
 * Move one of the two default flags ("billing" or "shipping") to an address.
 *
 * DEFAULT-ADDRESS SEMANTICS — what Medusa actually models, and what it does.
 * There is no single "preferred address" concept. `CustomerAddress` has exactly
 * two boolean columns, `is_default_billing` and `is_default_shipping`, each
 * backed by a partial unique index
 * (`IDX_customer_address_unique_customer_billing` / `..._shipping`,
 * `where: '"is_default_*" = true'`), so a customer has at most one default per
 * purpose and the two purposes are independent.
 *
 * `POST /store/customers/me/addresses/:id` does NOT need the previous holder
 * cleared first: `updateCustomerAddressesWorkflow` runs
 * `maybeUnsetDefaultBillingAddressesStep` and
 * `maybeUnsetDefaultShippingAddressesStep` IN PARALLEL BEFORE the update step
 * (see the installed `dist/customer/workflows/update-addresses.js`). Those steps
 * clear the flag on the customer's other addresses whenever the incoming payload
 * sets it to `true`, which is what keeps the partial unique index satisfiable.
 *
 * This was verified against the running backend rather than assumed: a single
 * POST with `{ is_default_billing: true }` moved the flag and left the previous
 * address at `false`, with no 409 and no 500. Repeating the dance here as well
 * would be redundant work whose failure mode — leaving the customer with no
 * default at all — is worse than doing nothing.
 *
 * The UI therefore offers TWO buttons per address rather than one "make
 * default", and says why in one line (`account.addresses.defaultNote`).
 */
export const setDefaultCustomerAddress = async (
  addressId: string,
  purpose: "billing" | "shipping"
): Promise<{ success: boolean; error: string | null }> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const flag = purpose === "billing" ? "is_default_billing" : "is_default_shipping"

  try {
    await sdk.store.customer.updateAddress(addressId, { [flag]: true }, {}, headers)

    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: shopperAuthError(err, t("address.error.default")),
    }
  }
}

/**
 * Remove a saved address.
 *
 * Orders keep their own copy of the address (`order_address`), so deleting an
 * address does not rewrite history — which is what the confirmation dialog
 * tells the shopper.
 */
export const deleteCustomerAddress = async (
  addressId: string
): Promise<{ success: boolean; error: string | null }> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(() => ({ success: true, error: null }))
    .catch((err) => ({
      success: false,
      error: shopperAuthError(err, t("address.error.default")),
    }))
}
