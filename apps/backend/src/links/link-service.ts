/**
 * Narrow, hand-written shape of the container's Link service.
 *
 * `ContainerRegistrationKeys.LINK` resolves the internal `Link` class from
 * `@medusajs/modules-sdk`, which is not re-exported from
 * `@medusajs/framework/types`. Only the two methods these workflows use are
 * declared, so the call sites stay type-checked instead of falling back to `any`.
 *
 * A `LinkDefinition` is keyed by module: `{ [Modules.PRODUCT]: { product_id } }`.
 * `Link.getLinkDataConfig` derives the linkable key name from the keys of the
 * value object, which is why BOTH sides must be present — a partial definition
 * such as `{ product: { product_id } }` cannot address a link row on its own.
 */
export type LinkDefinition = Record<string, Record<string, string>>

export type LinkRow = {
  id: string
  product_id?: string
  brand_id?: string
  pet_product_profile_id?: string
}

export interface MedusaLinkService {
  create(link: LinkDefinition | LinkDefinition[]): Promise<LinkRow[]>
  dismiss(link: LinkDefinition | LinkDefinition[]): Promise<LinkRow[]>
  list(
    link: LinkDefinition | LinkDefinition[],
    options?: { asLinkDefinition?: boolean }
  ): Promise<LinkRow[]>
}
