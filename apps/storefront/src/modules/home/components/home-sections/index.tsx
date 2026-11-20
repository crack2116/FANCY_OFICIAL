import { getBranding } from "@lib/branding"
import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import {
  homeCategoryCards,
  homeRails,
  type HomeSecondaryBanner,
} from "@lib/home-config"
import { t } from "@lib/i18n/translations"
import {
  getActiveBanners,
  resolveCategoryCards,
  resolveRails,
  type ResolvedRail,
} from "@lib/util/home-merchandising"
import { HttpTypes } from "@medusajs/types"
import EmptyState from "@modules/common/components/empty-state"
import CategoryShowcase from "@modules/home/components/category-showcase"
import CollectionRail from "@modules/home/components/collection-rail"
import FeaturedProductsRail from "@modules/home/components/featured-products-rail"
import ProductRailSkeleton from "@modules/home/components/product-rail/skeleton"
import SecondaryBanner from "@modules/home/components/secondary-banner"
import { Suspense } from "react"

type HomeSection =
  | { kind: "rail"; id: string; order: number; rail: ResolvedRail }
  | {
      kind: "banner"
      id: string
      order: number
      banner: HomeSecondaryBanner
    }

function Unavailable() {
  return (
    <div className="site-section">
      <div className="site-container">
        <EmptyState
          title={t("empty.state.error.title")}
          description={t("empty.state.error.description")}
          actionLabel={t("empty.state.browseStore")}
          actionHref="/store"
          data-testid="home-unavailable"
        />
      </div>
    </div>
  )
}

export default async function HomeSections({
  region,
}: {
  region: HttpTypes.StoreRegion | null | undefined
}) {
  if (!region) {
    return <Unavailable />
  }

  const taxonomy = await Promise.all([
    listCategories(),
    listCollections({ fields: "id, handle, title" }),
  ]).catch(() => null)

  if (!taxonomy) {
    return <Unavailable />
  }

  const [categories, collectionList] = taxonomy

  const categoryArtwork = await getBranding()
    .then((branding) => branding.category_artwork)
    .catch(() => ({}))

  const cards = resolveCategoryCards(
    homeCategoryCards,
    categories ?? [],
    categoryArtwork
  )
  const rails = resolveRails(homeRails, collectionList?.collections ?? [])
  const banners = getActiveBanners()
  const hasFeaturedRail = rails.some(
    (rail) =>
      rail.id === "featured" || rail.titleKey === "home.rails.featured.title"
  )

  const sections: HomeSection[] = [
    ...rails.map((rail) => ({
      kind: "rail" as const,
      id: rail.id,
      order: rail.order,
      rail,
    })),
    ...banners.map((banner) => ({
      kind: "banner" as const,
      id: banner.id,
      order: banner.order,
      banner,
    })),
  ].sort((a, b) => a.order - b.order)

  return (
    <>
      <CategoryShowcase cards={cards} />

      {/* Primary Featured Rail: PRODUCTOS DEL MES */}
      {!hasFeaturedRail ? (
        <Suspense
          fallback={
            <ProductRailSkeleton
              id="productos-del-mes"
              title={t("home.rails.featured.title")}
              subtitle={t("home.rails.featured.subtitle")}
            />
          }
        >
          <FeaturedProductsRail region={region} />
        </Suspense>
      ) : null}

      {sections.map((section) =>
        section.kind === "rail" ? (
          <Suspense
            key={section.id}
            fallback={
              <ProductRailSkeleton
                id={section.id}
                title={t(section.rail.titleKey)}
                subtitle={t(section.rail.subtitleKey)}
              />
            }
          >
            <CollectionRail rail={section.rail} region={region} />
          </Suspense>
        ) : (
          <SecondaryBanner key={section.id} banner={section.banner} />
        )
      )}
    </>
  )
}
