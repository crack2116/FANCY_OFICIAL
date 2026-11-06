/**
 * ============================================================================
 *  DEV ONLY — account test fixtures. NEVER RUNS IN PRODUCTION.
 * ============================================================================
 *
 * Creates two local customers, `customer-a@example.test` and
 * `customer-b@example.test`, each with one completed order. Their addresses and
 * orders use DIFFERENT products, so the two accounts are distinguishable at a
 * glance when checking that one shopper can never see the other's data.
 *
 *   ACCOUNT_FIXTURES_PASSWORD=<anything> \
 *     pnpm exec medusa exec ./src/scripts/create-account-test-fixtures.ts
 *
 * WHY IT TALKS HTTP INSTEAD OF USING WORKFLOWS
 * Every step below goes through the PUBLIC Store API with a real bearer token:
 *
 *   register -> login -> POST /store/customers -> login again -> saved address
 *   -> authenticated cart -> line item -> shipping address -> shipping option
 *   -> payment collection -> payment session (pp_system_default)
 *   -> POST /store/carts/:id/complete
 *
 * That is the same sequence a browser performs, so the fixtures exercise the
 * real ownership rules instead of a privileged shortcut. There is NO SQL, no
 * direct repository insert and no Order Module manipulation here: an order only
 * comes into existence because `complete` created it, which is the only way to
 * get a correct set of totals, promotions and payment state.
 *
 * THE PASSWORD IS NOT IN THIS FILE
 * `example.test` is a reserved TLD (RFC 2606) that can never route to a real
 * mailbox, but a hardcoded credential in a repository is still a bad habit and
 * leaks into every clone. The password is read from `ACCOUNT_FIXTURES_PASSWORD`.
 * If that variable is unset the script reports exactly that and exits WITHOUT
 * creating anything — it never invents a password.
 *
 * NOTHING IS DELETED
 * The script only ever creates or detects. It never cancels, deletes or modifies
 * an existing order, customer or address, so running it against a database that
 * already holds real data can only ever ADD two obviously-fake accounts.
 *
 * IDEMPOTENT
 * Each customer is detected by email before anything is created. An existing
 * fixture is reported and skipped, so a second run changes nothing.
 */

import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const COUNTRY_CODE = "pe"
const CURRENCY_CODE = "pen"
const PASSWORD_ENV_VAR = "ACCOUNT_FIXTURES_PASSWORD"
const BACKEND_URL =
  process.env.FANTICYPERU_FIXTURES_BASE_URL ?? "http://localhost:9000"

/** The development payment provider configured for the Peru region. */
const PAYMENT_PROVIDER_ID = "pp_system_default"

/**
 * Hard stop outside development. `NODE_ENV=production` is the only environment
 * where this must never execute; the guard is deliberately at the very top of
 * the run function, before any container lookup or HTTP call.
 */
const ALLOWED_ENVIRONMENTS = ["development", "test", undefined, ""]

type FixtureCustomer = {
  email: string
  firstName: string
  lastName: string
  phone: string
  /**
   * Handle of the veterinary product this customer's order is built from.
   *
   * Why a handle and not a list position: `GET /store/products` returns the four
   * upstream Medusa demo products (`t-shirt`, `sweatshirt`, `shorts`,
   * `sweatpants`) FIRST, ahead of the 14 veterinary products this storefront
   * actually sells. Selecting by index therefore produced orders for "Medusa
   * T-Shirt" in a Peruvian veterinary account. Naming the handle makes the
   * fixture deterministic and independent of listing order.
   */
  productHandle: string
  addressName: string
  address1: string
  city: string
  province: string
  postalCode: string
}

const FIXTURE_CUSTOMERS: readonly FixtureCustomer[] = [
  {
    email: "customer-a@example.test",
    firstName: "Ana",
    lastName: "Prueba",
    phone: "+51987650001",
    productHandle: "cepillo-dental-para-perros",
    addressName: "Casa",
    address1: "Av. Bolognesi 123",
    city: "Piura",
    province: "Piura",
    postalCode: "150101",
  },
  {
    email: "customer-b@example.test",
    firstName: "Luis",
    lastName: "Prueba",
    phone: "+51987650002",
    productHandle: "shampoo-suave-para-perros",
    addressName: "Oficina",
    address1: "Jr. Los Pinos 456",
    city: "Castilla",
    province: "Piura",
    postalCode: "150101",
  },
]

/* -------------------------------------------------------------------------- */
/*  Narrow row shapes                                                          */
/* -------------------------------------------------------------------------- */

/**
 * `query.graph` returns loosely-typed data, so every read is narrowed to an
 * explicit local shape instead of being cast to `any`. Nothing in this file uses
 * `any`, `@ts-ignore` or an eslint-disable.
 */
type RegionRow = {
  id: string
  currency_code?: string | null
  countries?: ({ iso_2?: string | null } | null)[] | null
}
type CustomerRow = { id: string; email?: string | null }

/**
 * Info-level logger, resolved once the container is available. A plain function
 * keeps the step helpers free of a logger type import that the framework does not
 * re-export from a stable path.
 */
let log: (message: string) => void = () => {
  // Replaced in the entry point. A no-op keeps the helpers total if one is ever
  // called before the container resolves.
}

/* -------------------------------------------------------------------------- */
/*  Small HTTP helper                                                         */
/* -------------------------------------------------------------------------- */

type ApiResponse = {
  status: number
  body: Record<string, unknown>
}

/**
 * One request against the Store API.
 *
 * Non-2xx responses raise with the STATUS ONLY. The backend body can carry SQL,
 * column names or a stack, and this script's output goes straight to a developer's
 * terminal — but it still must not become a habit of printing payloads, so the
 * message is deliberately narrow.
 */
async function api(
  path: string,
  publishableKey: string,
  options: {
    method?: string
    token?: string
    body?: unknown
  } = {}
): Promise<ApiResponse> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-publishable-api-key": publishableKey,
  }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()

  let body: Record<string, unknown> = {}
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    body = {}
  }

  return { status: response.status, body }
}

async function apiOk(
  path: string,
  publishableKey: string,
  label: string,
  options: {
    method?: string
    token?: string
    body?: unknown
    /** Accepted statuses besides 2xx, e.g. 401 for an identity that exists. */
    allowStatus?: number[]
  } = {}
): Promise<ApiResponse> {
  const response = await api(path, publishableKey, options)
  const allowed = [
    ...Array.from({ length: 10 }, (_, index) => 200 + index),
    ...(options.allowStatus ?? []),
  ]

  if (!allowed.includes(response.status)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${label} failed with HTTP ${response.status}.`
    )
  }

  return response
}

/* -------------------------------------------------------------------------- */
/*  Narrows                                                                   */
/* -------------------------------------------------------------------------- */

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

/**
 * Medusa's auth login returns the token as a bare JSON string on success, and an
 * object (`{ token, ... }`, or a `location` for a third-party provider) otherwise.
 */
function readToken(body: Record<string, unknown>): string | null {
  if (typeof body === "string") {
    return null
  }

  const token = body.token
  return typeof token === "string" && token ? token : null
}

/* -------------------------------------------------------------------------- */
/*  Steps                                                                     */
/* -------------------------------------------------------------------------- */

async function login(
  publishableKey: string,
  email: string,
  password: string
): Promise<string> {
  const response = await apiOk(
    "/auth/customer/emailpass",
    publishableKey,
    `Login for ${email}`,
    { method: "POST", body: { email, password } }
  )

  const token = readToken(response.body)

  if (!token) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Login for ${email} returned no token.`
    )
  }

  return token
}

async function createOrder(
  publishableKey: string,
  fixture: FixtureCustomer,
  token: string,
  variantId: string,
  productTitle: string,
  regionId: string
): Promise<string> {
  // An AUTHENTICATED cart, so completing it attaches the customer to the order.
  const cartResponse = await apiOk("/store/carts", publishableKey, "Create cart", {
    method: "POST",
    token,
    body: { region_id: regionId },
  })
  const cartId = asString(asRecord(cartResponse.body.cart).id)

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Cart creation returned no id."
    )
  }

  await apiOk(
    `/store/carts/${cartId}/line-items`,
    publishableKey,
    "Add line item",
    { method: "POST", token, body: { variant_id: variantId, quantity: 1 } }
  )

  const address = {
    first_name: fixture.firstName,
    last_name: fixture.lastName,
    company: "",
    address_1: fixture.address1,
    address_2: "",
    city: fixture.city,
    province: fixture.province,
    postal_code: fixture.postalCode,
    country_code: COUNTRY_CODE,
    phone: fixture.phone,
  }

  await apiOk(`/store/carts/${cartId}`, publishableKey, "Set cart addresses", {
    method: "POST",
    token,
    body: {
      email: fixture.email,
      shipping_address: address,
      billing_address: address,
    },
  })

  const optionsResponse = await apiOk(
    `/store/shipping-options?cart_id=${cartId}`,
    publishableKey,
    "List shipping options"
  )
  const firstOption = asArray(optionsResponse.body.shipping_options)[0]
  const optionId = asString(asRecord(firstOption).id)

  if (!optionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No shipping option matches ${COUNTRY_CODE}. Run bootstrap-peru first.`
    )
  }

  await apiOk(
    `/store/carts/${cartId}/shipping-methods`,
    publishableKey,
    "Set shipping method",
    { method: "POST", token, body: { option_id: optionId } }
  )

  const collectionResponse = await apiOk(
    "/store/payment-collections",
    publishableKey,
    "Create payment collection",
    { method: "POST", token, body: { cart_id: cartId } }
  )
  const collectionId = asString(
    asRecord(collectionResponse.body.payment_collection).id
  )

  if (!collectionId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Payment collection creation returned no id."
    )
  }

  await apiOk(
    `/store/payment-collections/${collectionId}/payment-sessions`,
    publishableKey,
    `Initialise ${PAYMENT_PROVIDER_ID}`,
    { method: "POST", token, body: { provider_id: PAYMENT_PROVIDER_ID } }
  )

  const completeResponse = await apiOk(
    `/store/carts/${cartId}/complete`,
    publishableKey,
    "Complete cart",
    { method: "POST", token, body: {} }
  )

  if (asString(completeResponse.body.type) !== "order") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Completing the fixture cart did not produce an order."
    )
  }

  const order = asRecord(completeResponse.body.order)
  const orderId = asString(order.id)

  if (!orderId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Completed order has no id."
    )
  }

  log(`    order ${orderId} (#${order.display_id ?? "?"}) — ${productTitle}`)

  return orderId
}

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

export default async function createAccountTestFixtures({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // `log` is the one indirection the step helpers need, so they do not have to
  // carry the container's logger type around.
  log = (message: string) => {
    logger.info(message)
  }

  // ---------------------------------------------------------- production ---
  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "create-account-test-fixtures is DEV ONLY and refused to run with NODE_ENV=production."
    )
  }

  if (!ALLOWED_ENVIRONMENTS.includes(process.env.NODE_ENV)) {
    logger.warn(
      `NODE_ENV=${process.env.NODE_ENV} is not a development environment. Continuing, but this script should not be used outside development.`
    )
  }

  // ------------------------------------------------------------- password ---
  const password = process.env[PASSWORD_ENV_VAR]

  if (!password) {
    logger.warn(
      `${PASSWORD_ENV_VAR} is not set. Skipping fixture creation — no password was invented.`
    )
    logger.warn(
      `Set it and re-run:  ${PASSWORD_ENV_VAR}=<value> pnpm exec medusa exec ./src/scripts/create-account-test-fixtures.ts`
    )
    return
  }

  logger.info("Creating account test fixtures (DEV ONLY).")

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ------------------------------------------------- publishable api key ---
  // Read through the API Key MODULE service rather than `query.graph`: the module
  // does not register a `publishable_key` graph entity, so a graph query fails
  // with "Service with alias ... was not found". No token is logged.
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const apiKeys = await apiKeyModule.listApiKeys({ type: "publishable" }, { take: 1 })
  const publishableKey = apiKeys[0]?.token

  if (!publishableKey) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No publishable API key found. Run the initial data seed first."
    )
  }

  // ---------------------------------------------------------------- region ---
  const regionsResponse = await apiOk("/store/regions", publishableKey, "List regions")
  const region = asArray(regionsResponse.body.regions)
    .map(asRecord)
    .find((row) => {
      const countries = asArray(row.countries)
        .map(asRecord)
        .some((country) => country.iso_2 === COUNTRY_CODE)

      return row.currency_code === CURRENCY_CODE || countries
    })

  const regionId = asString(region?.id)

  if (!regionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No ${CURRENCY_CODE} region covering ${COUNTRY_CODE}. Run bootstrap-peru first.`
    )
  }

  logger.info(`Region: ${regionId} (${CURRENCY_CODE})`)

  // -------------------------------------------------------------- catalogue ---
  // Resolve each fixture's product BY HANDLE through the public Store API, so
  // the fixtures only ever reference products this storefront actually sells
  // and never depend on the order `GET /store/products` happens to return.
  const byHandle = new Map<string, { variantId: string; title: string }>()

  for (const fixture of FIXTURE_CUSTOMERS) {
    if (byHandle.has(fixture.productHandle)) {
      continue
    }

    const response = await apiOk(
      `/store/products?handle=${encodeURIComponent(
        fixture.productHandle
      )}&region_id=${regionId}&fields=id,title,handle,variants.id`,
      publishableKey,
      `Resolve product "${fixture.productHandle}"`
    )

    const product = asArray(response.body.products).map(asRecord)[0]
    const variantId = asArray(product?.variants).map(asRecord)[0]
    const resolvedVariantId = asString(asRecord(variantId)?.id)

    if (!resolvedVariantId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Fixture product "${fixture.productHandle}" was not found in ${CURRENCY_CODE}, or has no variant. Seed the catalogue first.`
      )
    }

    byHandle.set(fixture.productHandle, {
      variantId: resolvedVariantId,
      title: asString(asRecord(product).title) ?? fixture.productHandle,
    })
  }

  // --------------------------------------------------------- existing check ---
  const { data: existingCustomers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { email: FIXTURE_CUSTOMERS.map((fixture) => fixture.email) },
  })

  const existingEmails = new Set(
    ((existingCustomers ?? []) as CustomerRow[])
      .map((row) => asString(row.email)?.toLowerCase())
      .filter((email): email is string => Boolean(email))
  )

  // ------------------------------------------------------------------ build ---
  for (const fixture of FIXTURE_CUSTOMERS) {
    if (existingEmails.has(fixture.email.toLowerCase())) {
      logger.warn(
        `  ${fixture.email} already exists — skipping (nothing is modified or deleted).`
      )
      continue
    }

    const product = byHandle.get(fixture.productHandle)!

    logger.info(`  ${fixture.email}`)

    // 1. Identity. A 401 here would mean the identity already exists, in which
    //    case the customer-detection query above should have caught it; treat it
    //    as "already there" rather than crashing.
    const registerResponse = await api(
      "/auth/customer/emailpass/register",
      publishableKey,
      { method: "POST", body: { email: fixture.email, password } }
    )

    if (registerResponse.status >= 300) {
      logger.warn(
        `    identity already exists (HTTP ${registerResponse.status}) — continuing.`
      )
    }

    // 2. First login. The token is not yet bound to a customer record.
    let token = await login(publishableKey, fixture.email, password)

    // 3. Customer record.
    const meBefore = await api("/store/customers/me", publishableKey, { token })
    const hasCustomer = meBefore.status === 200

    if (!hasCustomer) {
      await apiOk("/store/customers", publishableKey, "Create customer", {
        method: "POST",
        token,
        body: {
          email: fixture.email,
          first_name: fixture.firstName,
          last_name: fixture.lastName,
          phone: fixture.phone,
        },
      })

      // Log in AGAIN: the first token carries no `actor_id`, so the store routes
      // reject it with 401 until the identity is bound to a customer. This is
      // the same two-step the storefront's own signup flow performs.
      token = await login(publishableKey, fixture.email, password)
    }

    const me = await apiOk("/store/customers/me", publishableKey, "Read customer", {
      token,
    })
    const customerId = asString(asRecord(me.body.customer).id)

    // 4. Saved address, through the store's own customer-address route.
    await apiOk(
      "/store/customers/me/addresses",
      publishableKey,
      "Create saved address",
      {
        method: "POST",
        token,
        body: {
          address_name: fixture.addressName,
          first_name: fixture.firstName,
          last_name: fixture.lastName,
          company: "",
          address_1: fixture.address1,
          address_2: "",
          city: fixture.city,
          province: fixture.province,
          postal_code: fixture.postalCode,
          country_code: COUNTRY_CODE,
          phone: fixture.phone,
          is_default_billing: true,
          is_default_shipping: true,
        },
      }
    )

    // 5. Order through the public checkout flow.
    const orderId = await createOrder(
      publishableKey,
      fixture,
      token,
      product.variantId,
      product.title,
      regionId
    )

    logger.info(`    customer ${customerId} · 1 saved address · order ${orderId}`)
  }

  logger.info("Account fixtures done. Nothing was deleted or modified.")
}