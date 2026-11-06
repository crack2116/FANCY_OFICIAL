/**
 * Data access for the Admin screens, as react-query hooks.
 *
 * One place owns the query keys, so a mutation can invalidate exactly the reads
 * it affected instead of every screen guessing. Without that, saving a brand on
 * the detail page leaves the list page showing the previous status until a manual
 * reload — which is exactly the kind of quiet staleness an operator loses
 * merchandising data to.
 *
 * The dashboard already mounts a `QueryClientProvider`, so these hooks share the
 * same client as the core Admin and their cache is dropped on the same schedule.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import {
  assignBrandToProduct,
  createBrand,
  listBrands,
  listSpecies,
  listStoreCategories,
  removeBrandFromProduct,
  removePetProductProfile,
  retrieveBranding,
  retrieveProductPetData,
  setBrandActive,
  updateBranding,
  updateBrand,
  upsertPetProductProfile,
  uploadBrandingArtwork,
  type AdminBranding,
  type ArtworkTarget,
  type CreateBrandInput,
  type UpdateBrandingBody,
  type UpdateBrandInput,
} from "./admin-api"
import type {
  AdminBrand,
  AdminSpecies,
  AssignBrandBody,
  UpsertPetProductProfileBody,
} from "./vet-domain"

export const queryKeys = {
  brands: (isActive?: boolean) => ["brands", isActive ?? "all"] as const,
  species: (isActive?: boolean) => ["species", isActive ?? "all"] as const,
  productPetData: (productId: string) => ["product-pet-data", productId] as const,
  branding: ["branding"] as const,
  storeCategories: ["store-categories"] as const,
}

/**
 * Current storefront branding.
 *
 * One row, read once per screen. Not paginated and not filtered, because there
 * is only ever one store.
 */
export function useBranding() {
  return useQuery({
    queryKey: queryKeys.branding,
    queryFn: async () => (await retrieveBranding()).branding,
  })
}

/**
 * The categories an artwork control is rendered for.
 *
 * Read from the STORE API rather than from an admin list on purpose: this is the
 * exact set the home page resolves its cards against, so a control can never be
 * shown for a category the storefront would not render, and the category NAME
 * shown here is the one a shopper reads rather than a translation invented here.
 *
 * A failure leaves this query in an error state that the form renders as a short
 * explanation with the section hidden, rather than taking the whole screen down:
 * no categories means no artwork controls, which costs the operator one section
 * and never the colours next to it.
 */
export function useStoreCategories() {
  return useQuery({
    queryKey: queryKeys.storeCategories,
    queryFn: async () => (await listStoreCategories()).product_categories ?? [],
    retry: false,
  })
}

/**
 * Save branding.
 *
 * The saved value is written into the cache rather than only invalidated, so
 * the form shows exactly what the server stored. The route already re-reads
 * through the shared validator before responding, so trusting that payload
 * cannot reintroduce a value the storefront would reject.
 */
export function useUpdateBranding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateBrandingBody) => updateBranding(input),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.branding, response.branding)
    },
  })
}

/**
 * Upload one artwork image, into either the category or the hero map.
 *
 * The upload endpoint persists on its own — it runs a workflow, it is not a
 * staging area — so the returned URL is merged straight into the cached branding
 * map. That keeps ONE Save button for the whole screen while the artwork control
 * still reflects what is stored without a second click.
 */
export function useUploadBrandingArtwork() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      target,
      key,
      file,
    }: {
      target: ArtworkTarget
      key: string
      file: File
    }) => uploadBrandingArtwork(target, key, file),
    onSuccess: ({ artwork }) => {
      queryClient.setQueryData<AdminBranding>(queryKeys.branding, (current) => {
        if (!current) {
          return current
        }

        // The map is picked by the RESPONSE's target rather than the one that was
        // sent, so a server-side default can never write a hero image into the
        // category map.
        const map =
          artwork.target === "hero" ? current.hero_artwork : current.category_artwork

        return artwork.target === "hero"
          ? {
              ...current,
              hero_artwork: { ...map, [artwork.key]: artwork.url },
            }
          : {
              ...current,
              category_artwork: { ...map, [artwork.key]: artwork.url },
            }
      })
    },
  })
}

/**
 * Brands, newest-configuration first.
 *
 * Both active and inactive are requested unless the caller narrows: the list
 * screen has to show a deactivated brand so it can be reactivated, while the
 * product widget only ever assigns active ones. The API caps a page at 200,
 * which is the request this sends.
 */
export function useBrands(isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.brands(isActive),
    queryFn: () => listBrands(isActive),
  })
}

/** Species, ordered by the store's own `sort_order` for the dropdown order. */
export function useSpecies(isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.species(isActive),
    queryFn: async () => {
      const response = await listSpecies(isActive)

      return [...response.species].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      )
    },
  })
}

/**
 * A product's brand and pet profile.
 *
 * `enabled` is gated on a real product id: the widget reads it from the route,
 * and an empty id must not produce a request to `/admin/products/`.
 */
export function useProductPetData(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.productPetData(productId ?? ""),
    queryFn: () => retrieveProductPetData(productId as string),
    enabled: Boolean(productId),
  })
}

/**
 * A brand write has to refresh every read that can show it.
 *
 * Both brand lists, every product's pet data and the product index are touched:
 * the brand appears on a card, on a product page and in a facet, and a stale
 * copy of any of those is a support ticket.
 */
function invalidateBrandReads(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["brands"] })
  queryClient.invalidateQueries({ queryKey: ["product-pet-data"] })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBrandInput) => createBrand(input),
    onSuccess: () => invalidateBrandReads(queryClient),
  })
}

export function useUpdateBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBrandInput }) =>
      updateBrand(id, input),
    onSuccess: () => invalidateBrandReads(queryClient),
  })
}

/** Activate or deactivate. Split from the PATCH so the scopes stay separable. */
export function useSetBrandActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setBrandActive(id, isActive),
    onSuccess: () => invalidateBrandReads(queryClient),
  })
}

function invalidateProductPetData(queryClient: QueryClient, productId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.productPetData(productId) })
}

export function useAssignProductBrand(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: AssignBrandBody) => assignBrandToProduct(productId, body),
    onSuccess: () => {
      invalidateProductPetData(queryClient, productId)
      invalidateBrandReads(queryClient)
    },
  })
}

export function useRemoveProductBrand(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeBrandFromProduct(productId),
    onSuccess: () => {
      invalidateProductPetData(queryClient, productId)
      invalidateBrandReads(queryClient)
    },
  })
}

export function useUpsertProductPetProfile(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpsertPetProductProfileBody) =>
      upsertPetProductProfile(productId, body),
    onSuccess: () => invalidateProductPetData(queryClient, productId),
  })
}

export function useRemoveProductPetProfile(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removePetProductProfile(productId),
    onSuccess: () => invalidateProductPetData(queryClient, productId),
  })
}

/** Narrow a loaded list to assignable brands, in the order they are read. */
export function assignableBrands(brands: AdminBrand[] | undefined): AdminBrand[] {
  return (brands ?? []).filter((brand) => brand.is_active)
}

/** Narrow a loaded list to species an operator can still pick. */
export function activeSpecies(species: AdminSpecies[] | undefined): AdminSpecies[] {
  return (species ?? []).filter((entry) => entry.is_active)
}