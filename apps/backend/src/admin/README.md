# Admin Customizations

## Install FancyPets Admin on a phone or tablet

The online-only admin can be added to a home screen with its own icon and standalone window. Native Medusa sign-in, MFA and authorization remain unchanged. There is no service worker, offline mode or private-data cache.

1. Publish the admin over HTTPS and open its admin URL (default `/app/`).
2. On iPhone/iPad, use Safari's Share menu → **Add to Home Screen**. On Android, use Chrome's **Install app** or **Add to Home screen** action when available.
3. Open the installed icon. Medusa decides whether to show sign-in or the authorized admin page. An internet connection is required.

Installation UI and eligibility vary by browser/device. Desktop emulation is not proof of successful device installation.

### Maintain installation assets

`medusa-config.ts` uses the supported `admin.vite` hook to serve `src/admin/public` and inject manifest, theme, Apple and one safe-area viewport tag into every admin page. Relative manifest identity/scope/start URLs follow the configured Vite admin base, default `/app/`.

From `apps/backend`, regenerate opaque PNGs with an already available Sharp module (no dependency installation required):

```sh
node scripts/generate-admin-pwa-icons.cjs "<path-to-installed-sharp>"
pnpm exec medusa build --admin-only
```

Edit `src/admin/assets/pwa-icon.svg` to change the mark; keep important artwork inside the central maskable safe zone. The generator produces 192px, 512px, maskable 512px and Apple 180px icons.

Production Medusa static assets use long immutable caching. When changing published icons or manifest contents, bump their `-v1` filenames together in the generator, manifest, HTML helper and tests, then rebuild. Keep `id` stable. A running development server may need an authorized restart after changing its Vite configuration.

References: [Medusa admin Vite configuration](https://docs.medusajs.com/learn/configurations/medusa-config#vite), [Vite public assets](https://vite.dev/config/shared-options.html#publicdir), [Vite HTML hook](https://vite.dev/guide/api-plugin.html#transformindexhtml), [PWA installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

You can extend the Medusa Admin to add widgets and new pages. Your customizations interact with API routes to provide merchants with custom functionalities.

> Learn more about Admin Extensions in [this documentation](https://docs.medusajs.com/learn/fundamentals/admin).

## Example: Create a Widget

A widget is a React component that can be injected into an existing page in the admin dashboard.

For example, create the file `src/admin/widgets/product-widget.tsx` with the following content:

```tsx title="src/admin/widgets/product-widget.tsx"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

// The widget
const ProductWidget = () => {
  return (
    <div>
      <h2>Product Widget</h2>
    </div>
  )
}

// The widget's configurations
export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductWidget
```

This inserts a widget with the text “Product Widget” at the end of a product’s details page.
