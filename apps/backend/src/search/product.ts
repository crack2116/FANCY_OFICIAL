import type { SearchTypes } from "@medusajs/framework/types";
import {
  defineSearchIndex,
  graphConsume,
  graphSeed,
  search,
} from "@medusajs/framework/utils";

import { ProductOptionRow, toOptionValues } from "./helpers/option-values";
import { loadPricing, priceFields, toProductPricing } from "./helpers/pricing";
import { resolveProductIds } from "./helpers/resolve-product-ids";

const PRODUCT_GRAPH_FIELDS = [
  "id",
  "title",
  "description",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "sales_channels.id",
  "categories.name",
  "tags.value",
  "options.title",
  "options.values.value",
  // v3: the two module links declared in `src/links`. Both are resolved by the
  // remote joiner from the SAME product query — one read for the products, one
  // read per linked service for the whole batch. There is no per-product read,
  // so a listing of 18 products is not 18 brand queries.
  "brand.name",
  "brand.handle",
  "pet_product_profile.life_stage",
  "pet_product_profile.pet_size",
  "pet_product_profile.species.code",
];

type ProductRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  handle?: string | null;
  thumbnail?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  deleted_at?: string | Date | null;
  sales_channels?: ({ id?: string | null } | null)[] | null;
  categories?: ({ name?: string | null } | null)[] | null;
  tags?: ({ value?: string | null } | null)[] | null;
  options?: ProductOptionRow[] | null;
  /** Resolved through the product <-> brand module link; singular object. */
  brand?: ({ name?: string | null; handle?: string | null } | null) | null;
  /** Resolved through the product <-> profile module link; optional 1:1. */
  pet_product_profile?: (PetProductProfileRow | null) | null;
};

type PetProductProfileRow = {
  life_stage?: string | null;
  pet_size?: string | null;
  species?: ({ code?: string | null } | null)[] | null;
};

const productFields = search.define({
  id: search.keyword().filterable().retrievable(),
  // Read by `/store/search` to scope the index; never returned to hits.
  status: search.keyword().filterable().retrievable(false),
  sales_channel_ids: search.keyword().array().filterable().retrievable(false),
  title: search.text().searchable({ weight: 3 }).sortable().retrievable(),
  description: search.text().searchable({ weight: 1 }),
  handle: search.keyword().retrievable(),
  // Returned on hits only: never filtered, sorted or faceted on.
  thumbnail: search.keyword().retrievable(),
  created_at: search.date().sortable().retrievable(),
  category: search.keyword().array().filterable().facetable().retrievable(),
  labels: search.keyword().array().filterable().facetable().retrievable(),
  option_values: search
    .keyword()
    .array()
    .searchable({ weight: 2 })
    .filterable()
    .facetable()
    .retrievable(),
  // v3: the linked commercial domain.
  //
  // `brand_name` ranks at weight 2, the same as `option_values` and below
  // `title` (3): a brand is a strong commercial qualifier ("nutripet" should
  // surface the whole brand) but it is not the product's identity, so it must
  // never outrank a title that literally matches the query. Above
  // `description` (1) because a brand token is a deliberate query while
  // description text is incidental.
  // `brand_name` is searchable AND filterable/facetable: a shopper both types the
  // brand and ticks it in a facet list, and they read the same value.
  brand_name: search
    .keyword()
    .searchable({ weight: 2 })
    .filterable()
    .facetable()
    .retrievable(),
  // The handle is filterable and retrievable but NOT searchable: its tokens are
  // already covered by the full-text `brand_name`, and indexing both would feed
  // the same terms into BM25 twice and inflate every brand score. It is also not
  // facetable — a shopper reads the brand name, never the machine key.
  brand_handle: search.keyword().filterable().retrievable(),
  // Species is an array because a product is valid for several at once
  // (dog AND cat). An empty array, not a missing field, is what a product with
  // no profile writes: the same "real bucket" reasoning as `on_sale_*`.
  //
  // `species`, `life_stage` and `pet_size` are filterable and facetable but NOT
  // searchable, on purpose: their values are codes, not prose, so full-text
  // matching would feed low-value tokens ("all" matching everything) into every
  // BM25 sum. They are reached through a facet, which is how a shopper picks
  // them.
  species: search.keyword().array().filterable().facetable().retrievable(),
  life_stage: search.keyword().filterable().facetable().retrievable(),
  pet_size: search.keyword().filterable().facetable().retrievable(),
  ...priceFields,
});

type ProductDocument = SearchTypes.InferSearchDocumentType<
  typeof productFields
>;

function toDocument(
  product: ProductRow,
  pricing: Parameters<typeof toProductPricing>[0],
): ProductDocument {
  const category = (product.categories ?? [])
    .map((productCategory) => productCategory?.name?.trim())
    .filter((name): name is string => Boolean(name));
  const labels = (product.tags ?? [])
    .map((tag) => tag?.value?.trim())
    .filter((value): value is string => Boolean(value));
  const salesChannelIds = (product.sales_channels ?? [])
    .map((salesChannel) => salesChannel?.id?.trim())
    .filter((id): id is string => Boolean(id));
  // Linked data is optional on purpose: a product with no brand, or no pet
  // profile, is a valid product and must stay searchable. Nothing here writes
  // `undefined` into the document, because a missing key and an empty array are
  // different facts for a facet.
  const brandName = product.brand?.name?.trim();
  const brandHandle = product.brand?.handle?.trim();
  const profile = product.pet_product_profile;
  const species = (profile?.species ?? [])
    .map((entry) => entry?.code?.trim())
    .filter((code): code is string => Boolean(code));

  return {
    id: product.id,
    status: product.status ?? null,
    sales_channel_ids: salesChannelIds,
    title: product.title ?? null,
    description: product.description ?? null,
    handle: product.handle ?? null,
    thumbnail: product.thumbnail ?? null,
    created_at: product.created_at ?? null,
    category,
    labels,
    option_values: toOptionValues(product.options),
    brand_name: brandName ?? null,
    brand_handle: brandHandle ?? null,
    species,
    life_stage: profile?.life_stage ?? null,
    pet_size: profile?.pet_size ?? null,
    ...toProductPricing(pricing),
  };
}

/**
 * A row that returns no document leaves
 * the index: the helpers turn it into a delete on `consume` and on the
 * catch-up pass.
 */
const source = {
  fields: PRODUCT_GRAPH_FIELDS,
  transform: async (
    rows: ProductRow[],
    context: SearchTypes.SearchIngestionContext,
  ) => {
    const pricing = await loadPricing(
      rows.map((row) => row.id),
      context,
    );

    return rows.map((row) => toDocument(row, pricing.get(row.id)));
  },
};

/**
 * Everything a document is built from, so a change to any of it re-indexes the
 * products it touches. Only `product.deleted` removes documents: a deleted
 * variant, option, tag or category means the product has to be re-read.
 *
 * TODO: price lists emit no events (create, update, delete, batch prices).
 * TODO: price lists crossing their start or end date change prices silently.
 * TODO: linkProductsToSalesChannelWorkflow emits nothing.
 * TODO: batchLinkProductsToCategoryWorkflow emits nothing.
 * TODO: upsertVariantPricesWorkflow emits nothing when called directly.
 *
 * TODO: the v3 fields come from module links (`brand`, `pet_product_profile`).
 * Writing a link emits a `Link_*.ATTACHED` event, not a product one, and the
 * Product Module emits nothing when a brand's own row changes — so none of that
 * reaches this list. Every writer of those links therefore replays
 * `product.updated` for the products it touched (see the `reindexProductsStep`
 * in `src/workflows/pet-product-links.ts`), which is the same approach
 * `bootstrap-vet-catalog.ts` already uses to refresh the index from a script.
 */
const PRODUCT_EVENTS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "product-variant.created",
  "product-variant.updated",
  "product-variant.deleted",
  "product-option.created",
  "product-option.updated",
  "product-option.deleted",
  "product-option-value.updated",
  "product-option-value.deleted",
  "product-tag.updated",
  "product-tag.deleted",
  "product-category.updated",
  "product-category.deleted",
  "sales-channel.deleted",
];

export default defineSearchIndex({
  name: "product",
  entity: "product",
  primary_key: "id",
  fields: productFields,
  settings: {
    typo_tolerance: { enabled: true },
  },
  events: PRODUCT_EVENTS,
  consume: graphConsume<typeof productFields, ProductRow>({
    ...source,
    resolve_ids: resolveProductIds,
    is_delete: (event) => event.name === "product.deleted",
  }),
  seed: graphSeed<typeof productFields, ProductRow>(source),
});
