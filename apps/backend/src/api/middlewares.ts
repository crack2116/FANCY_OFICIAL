import {
  allowFields,
  authenticate,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from '@medusajs/framework/http'
import {
  ContainerRegistrationKeys,
  MedusaError,
  PolicyOperation,
} from '@medusajs/framework/utils'
import { resolveFulfillmentAuthorization } from '../lib/fulfillment-authorization'
import { getServerSecret, sanitizeCartMetadata } from '../lib/cod-authorization'
import { requireAdminFinancialPrivilege } from '../lib/admin-financial-authorization'
import multer from 'multer'

/**
 * Enforces that orders cannot be fulfilled unless their payment is captured,
 * their manual payment was verified and server-signed, or cash-on-delivery
 * was explicitly authorized by an admin (POST /admin/orders/:id/authorize-cod).
 *
 * The decision is server-authoritative: buyer-written cart metadata
 * (is_cash_on_delivery, payment_method=contraentrega, forged fancyperu_cod /
 * manual_payment_status, ...) never opens the gate, because store carts
 * accept free-form metadata from any shopper and the core complete-cart
 * workflow copies it verbatim to order.metadata. Every metadata-based
 * authorization requires an HMAC signature bound to the order and computed
 * with the server secret; the secret/orderId pair also feeds the gate below.
 */
async function validatePaymentBeforeFulfillment(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const { id } = req.params
  if (!id) return next()

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: 'order',
    fields: ['id', 'status', 'metadata', 'payment_collections.status'],
    filters: { id },
  })

  const order = orders?.[0]
  if (!order) return next()

  const authorization = resolveFulfillmentAuthorization({
    paymentCollectionStatus: order.payment_collections?.[0]?.status,
    orderStatus: (order.status as string | undefined) || undefined,
    orderMetadata: (order.metadata as Record<string, unknown>) || {},
    orderId: id,
    serverSecret: getServerSecret(),
  })

  if (!authorization.allowed) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `[RESTRICTION] Order "${id}" cannot be fulfilled: Payment status is "${
        order.payment_collections?.[0]?.status || 'pending'
      }". Dispatch requires captured payment, an admin-verified manual payment, or cash-on-delivery explicitly authorized by an admin via POST /admin/orders/:id/authorize-cod.`
    )
  }

  next()
}

/**
 * P0-B ingestion defense: strips the server-reserved metadata keys
 * (`fancyperu_cod`, `manual_payment_status`, `manual_payment_audit_trail`)
 * from store cart create/update bodies.
 *
 * WHY BOTH req.body AND req.validatedBody: Medusa's core carts middlewares
 * run `validateAndTransformBody` on the same matcher/method BEFORE project
 * middlewares registered for the same route (the framework's RoutesSorter
 * keeps insertion order within a path bucket, and core source dirs are
 * scanned before the project's). The core validator copies req.body into
 * req.validatedBody and the core cart handlers spread `req.validatedBody`
 * into their workflow inputs, so sanitizing only req.body would leave the
 * validated copy untouched. Covering both fields keeps the cleanup effective
 * whether this middleware runs before or after the core validator; when it
 * runs before, the validator merely receives an already-clean body (metadata
 * is a declared, optional key, so removing reserved keys is schema-safe with
 * `.strict()`).
 *
 * Applies to the exact store cart routes whose core validators declare a
 * free-form `metadata` field (verified in
 * @medusajs/medusa/dist/api/store/carts at 2.21.2):
 * - POST /store/carts          StoreCreateCart       validators.js:23 (cart metadata; items[].metadata at :11 stays per-item and is never copied to order.metadata)
 * - POST /store/carts/:id      StoreUpdateCart       validators.js:48
 * - POST /store/carts/:id/line-items           StoreAddCartLineItem     validators.js:58 (line-item metadata; covered for defense in depth)
 * - POST /store/carts/:id/line-items/:line_id  StoreUpdateCartLineItem  validators.js:62 (same)
 */
function sanitizeCartReservedMetadataMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = req.body as Record<string, unknown> | undefined
  if (body && typeof body === 'object' && body.metadata !== undefined) {
    body.metadata = sanitizeCartMetadata(body.metadata)
  }

  const validatedBody = (req as { validatedBody?: Record<string, unknown> })
    .validatedBody
  if (
    validatedBody &&
    typeof validatedBody === 'object' &&
    validatedBody.metadata !== undefined
  ) {
    validatedBody.metadata = sanitizeCartMetadata(validatedBody.metadata)
  }

  next()
}

const SANITIZE_CART_RESERVED_METADATA = [sanitizeCartReservedMetadataMiddleware]

import {
  AdminCreateBrandBody,
  AdminListBrandsQuery,
  AdminUpdateBrandBody,
} from './admin/brands/validators'
import {
  AdminCreateSpeciesBody,
  AdminListSpeciesQuery,
  AdminUpdateSpeciesBody,
} from './admin/pet-product-species/validators'
import {
  AdminAssignBrandBody,
  AdminUpsertPetProductProfileBody,
} from './admin/products/validators'
import { StoreUpdateCustomerBody } from './store/customers/validators'

/**
 * Brand fields. Listed explicitly so a future internal column is not exposed by
 * accident.
 */
const BRAND_FIELDS = [
  'brand',
  'brand.id',
  'brand.name',
  'brand.handle',
  'brand.description',
  'brand.logo_url',
]

/**
 * Pet product profile fields. Only the commercial facets are public:
 * `species` (codes), `life_stage` and `pet_size`. The profile's own `id` is
 * included only because a nested relation needs it to hydrate; nothing else from
 * the row is exposed.
 */
const PET_PROFILE_FIELDS = [
  'pet_product_profile',
  'pet_product_profile.id',
  'pet_product_profile.life_stage',
  'pet_product_profile.pet_size',
  'pet_product_profile.species',
  'pet_product_profile.species.code',
  'pet_product_profile.species.name',
]

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
    // ---------------------------------------------------------------------
    // Store API: protected account order detail.
    //
    // `GET /store/customers/me/orders/:id` (this project's own route) must
    // never be reachable without a customer session, because it is the read the
    // /account order detail uses instead of the intentionally public
    // `GET /store/orders/:id`.
    //
    // Medusa's CORE middleware already covers this path with
    // `authenticate("customer", ["session", "bearer"])` on the wildcard matcher
    // `/store/customers/me*` (see the installed
    // `dist/api/store/customers/middlewares.js`). It is registered again here,
    // on the exact matcher, so the protection is declared next to this project's
    // own routes instead of being inherited invisibly from another package's
    // wildcard. Authenticating twice is harmless: the middleware is a pure read
    // of the session or the bearer JWT, and the handler additionally refuses to
    // run without `req.auth_context.actor_id`.
    //
    // It also means ownership is decided server-side from the authenticated
    // actor, never from a `customer_id` the browser supplied.
    // ---------------------------------------------------------------------
    {
      matcher: '/store/customers/me/orders/:id',
      method: ['GET'],
      middlewares: [authenticate('customer', ['session', 'bearer'])],
    },
    // ---------------------------------------------------------------------
    // Store API: customer profile input validation.
    //
    // Medusa's own `StoreUpdateCustomer` (installed
    // `dist/api/store/customers/validators.js`) declares every text field as
    // `z.string().nullish()`, so `{"first_name":""}` or `{"phone":"abc"}` is a
    // VALID body and the backend accepted both with 200. The shopper-facing form
    // rejects them, but the API itself did not, which left validation to the
    // client alone.
    //
    // This project routes only ONE caller through that endpoint: the profile
    // form (`modules/account/components/profile-details`). Checkout does not post
    // to `/store/customers/me`, so tightening the schema cannot break the
    // checkout flow. The fields stay `.nullish()` so a PARTIAL update (phone
    // only) keeps working; what changes is that a field PRESENT in the body must
    // also be valid, instead of any string being accepted.
    //
    // `email` is absent on purpose. Medusa's core `StoreUpdateCustomer` has no
    // `email` key, so the account identity is already not writable through this
    // route - which is why the account UI renders the address read-only instead
    // of relying on this validator to reject it.
    // ---------------------------------------------------------------------
    {
      matcher: '/store/customers/me',
      method: ['POST'],
      middlewares: [validateAndTransformBody(StoreUpdateCustomerBody)],
    },
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    // ---------------------------------------------------------------------
    // Store API: expose the linked commercial domain on product reads.
    //
    // `allowFields` is the supported mechanism. `GET /store/products` runs
    // `validateAndTransformQuery` with a fixed allow-list
    // (`api/store/products/query-config.js`), so without these entries
    // `?fields=+brand.name` would be rejected as an unknown field. The join
    // itself is done by the remote joiner from the module links, which means a
    // listing of 18 products resolves every brand and profile in the same
    // request — never one request per product.
    //
    // Only the fields listed above are allowed, so no internal column of either
    // module can be reached through the Store API.
    //
    // No `method` here on purpose: Medusa validates the query parameters BEFORE a
    // method-scoped middleware runs, so `allowFields` would arrive too late and
    // silently do nothing.
    // ---------------------------------------------------------------------
    {
      matcher: '/store/products',
      middlewares: [allowFields(BRAND_FIELDS, PET_PROFILE_FIELDS)],
    },
    {
      matcher: '/store/products/:id',
      middlewares: [allowFields(BRAND_FIELDS, PET_PROFILE_FIELDS)],
    },
    // ---------------------------------------------------------------------
    // Store API: strip server-reserved metadata keys from cart writes.
    //
    // Registered for the routes listed in the middleware doc comment (each one
    // verified as accepting free-form `metadata` in the installed
    // @medusajs/medusa 2.21.2 dist). See sanitizeCartReservedMetadataMiddleware
    // for the why-both-req.body/validatedBody note.
    // ---------------------------------------------------------------------
    {
      matcher: '/store/carts',
      methods: ['POST'],
      middlewares: SANITIZE_CART_RESERVED_METADATA,
    },
    {
      matcher: '/store/carts/:id',
      methods: ['POST'],
      middlewares: SANITIZE_CART_RESERVED_METADATA,
    },
    {
      matcher: '/store/carts/:id/line-items',
      methods: ['POST'],
      middlewares: SANITIZE_CART_RESERVED_METADATA,
    },
    {
      matcher: '/store/carts/:id/line-items/:line_id',
      methods: ['POST'],
      middlewares: SANITIZE_CART_RESERVED_METADATA,
    },
    // ---------------------------------------------------------------------
    // Admin API: multipart body for branding artwork (category circles and
    // hero slides).
    //
    // This project DOES need multer and there is no alternative. Medusa's body
    // parser stack is json/text/urlencoded only, so `multipart/form-data` is
    // never parsed by the core middlewares; the file is only on `req.files` if
    // something installs a multipart parser for the exact path. Medusa's own
    // `/admin/uploads` route does precisely this, and this entry is the same
    // shape, so the two behave identically.
    //
    // ONE registration for BOTH artwork targets: the handler reads a `target`
    // form field to decide which branding map the URL lands in, so there is no
    // second route to register and no second place for this parser to drift.
    //
    // `memoryStorage` rather than `diskStorage` on purpose: the route hands the
    // bytes to the workflow as a base64 string, so writing them to a temp
    // directory first would only add a second copy and a cleanup path. The cost
    // is that the body is held in memory, which is why the route rejects
    // anything over `MAX_ARTWORK_BYTES` before it reaches the workflow.
    //
    // `methods` (plural) is the current key; the singular `method` still exists
    // in the type but is deprecated and used above only where it already was.
    //
    // The instance is created ONCE at module scope, not per request: multer is
    // stateless apart from its configured storage engine, and rebuilding it on
    // every call would allocate a fresh engine per upload for no gain.
    // ---------------------------------------------------------------------
    {
      matcher: '/admin/branding/artwork',
      methods: ['POST'],
      middlewares: [upload.array('files')],
    },
    // ---------------------------------------------------------------------
    // Admin API: input validation.
    //
    // Authorisation is NOT handled here: Medusa's `ApiLoader` installs the admin
    // `authenticate("user", ...)` middleware on the whole `/admin` namespace, and
    // none of these routes export `AUTHENTICATE = false`.
    // ---------------------------------------------------------------------
    {
      matcher: '/admin/brands',
      method: ['GET'],
      middlewares: [
        validateAndTransformQuery(AdminListBrandsQuery, {
          defaults: [],
          allowed: ['id', 'name', 'handle', 'description', 'logo_url', 'is_active'],
        }),
      ],
    },
    {
      matcher: '/admin/brands',
      method: ['POST'],
      middlewares: [validateAndTransformBody(AdminCreateBrandBody)],
    },
    {
      matcher: '/admin/brands/:id',
      method: ['PATCH'],
      middlewares: [validateAndTransformBody(AdminUpdateBrandBody)],
    },
    {
      matcher: '/admin/pet-product-species',
      method: ['GET'],
      middlewares: [
        validateAndTransformQuery(AdminListSpeciesQuery, {
          defaults: [],
          allowed: ['id', 'code', 'name', 'is_active', 'sort_order'],
        }),
      ],
    },
    {
      matcher: '/admin/pet-product-species',
      method: ['POST'],
      middlewares: [validateAndTransformBody(AdminCreateSpeciesBody)],
    },
    {
      matcher: '/admin/pet-product-species/:id',
      method: ['PATCH'],
      middlewares: [validateAndTransformBody(AdminUpdateSpeciesBody)],
    },
    {
      matcher: '/admin/products/:id/brand',
      method: ['POST'],
      middlewares: [validateAndTransformBody(AdminAssignBrandBody)],
    },
    {
      matcher: '/admin/products/:id/pet-product-profile',
      method: ['POST'],
      middlewares: [validateAndTransformBody(AdminUpsertPetProductProfileBody)],
    },
    {
      matcher: '/admin/orders/:id/verify-manual-payment',
      method: ['POST'],
      middlewares: [
        authenticate('user', ['session', 'bearer']),
        requireAdminFinancialPrivilege,
      ],
      policies: [
        {
          resource: 'order',
          operation: PolicyOperation.update,
        },
      ],
    },
    {
      matcher: '/admin/orders/:id/authorize-cod',
      method: ['POST'],
      middlewares: [
        authenticate('user', ['session', 'bearer']),
        requireAdminFinancialPrivilege,
      ],
      policies: [
        {
          resource: 'order',
          operation: PolicyOperation.update,
        },
      ],
    },
    {
      matcher: '/admin/orders/:id/reconcile-culqi',
      method: ['POST'],
      middlewares: [
        authenticate('user', ['session', 'bearer']),
        requireAdminFinancialPrivilege,
      ],
      policies: [
        {
          resource: 'order',
          operation: PolicyOperation.update,
        },
      ],
    },
    {
      matcher: '/admin/orders/:id/fulfillments',
      method: ['POST'],
      middlewares: [
        authenticate('user', ['session', 'bearer']),
        validatePaymentBeforeFulfillment,
      ],
    },
    {
      matcher: '/store/orders/:id/manual-payment',
      method: ['POST'],
      middlewares: [],
    },
  ],
})
