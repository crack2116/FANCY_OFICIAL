# Informe de rediseño Fancy Pets

Fecha: 24/10/2026  
Alcance: staging `fancyperu-test-k6cmve` (`192.168.1.38`), build local final3 en `127.0.0.1:3001`  
Producción Dell `192.168.1.36`: no se tocó.

## 1. Resumen visual

El storefront pasó de un aspecto de starter genérico de Medusa a una tienda cálida y premium, en español peruano, inspirada en las referencias recibidas pero sin copiarlas literalmente.

- Fondo crema cálido `#FBF7F0`, bandas verde petróleo `#00546C`, naranja oficial `#F99C32` para acciones y coral `#F24534` para ofertas.
- Tipografía display Fredoka para títulos; Inter para texto y UI.
- Header crema/blanco con buscador redondeado, acciones en píldora, favoritos, carrito y navegación de categorías en píldoras.
- Hero editorial con ilustración principal del bowl, collage decorativo, badge de confianza flotante y doble CTA.
- Categorías en tarjetas tintadas, numeradas y con ilustración lineal.
- Rieles de productos con pestañas en píldora, flechas y tarjeta final “Ver todo”.
- Tarjetas de producto con imagen `4/5`, borde suave, elevación al hover, precio destacado y “Ver producto”.
- Franja de beneficios reales en tarjeta blanca de cuatro columnas.
- Footer con banda de cierre verde petróleo y cuerpo crema; el logo oficial se conserva sin modificaciones.
- Catálogo con sidebar de filtros en tarjeta blanca, barra de resultados, ordenamiento y estados de carga/vacío.
- Ficha de producto en dos columnas: galería sticky a la izquierda; título, precio, variantes, stock, cantidad, compra, pestañas y datos de mascota a la derecha.
- Login centrado debajo del header, en tarjeta blanca redondeada con borde y sombra sutiles, botón de marca y foco accesible.
- Carrito y checkout en español, con envío “Por calcular” hasta que exista un método real y resumen de dirección vacío corregido.

## 2. Referencias

Se descargaron e inspeccionaron las dos referencias:

- `ref1.jpg`: tienda de mascotas con header claro, barra promocional, hero editorial, mosaico de categorías y pestañas de más vendidos. Se usó como inspiración de jerarquía, calidez y ritmo visual.
- `ref2.jpg`: dashboard administrativo con sidebar, tarjetas KPI y tablas. Se usó para evaluar densidad y jerarquía, pero no se reemplazó el Admin de Medusa ni se construyó un panel paralelo.

La adaptación es deliberada: se tomaron decisiones de composición y paleta, no activos, textos ni layouts copiados.

## 3. Confirmación del logotipo oficial

El componente oficial `FancyPetsLogo` no se redibujó, recoloreó, recortó, reemplazó ni modificó. Tampoco se editó su archivo ni sus trazos.

- El header y el footer lo muestran tal cual, sobre superficies claras.
- El favicon es una marca separada: una huella, no el wordmark oficial.
- En el Admin, el logo oficial se conserva en las extensiones de login que ya lo usaban; no se forzó su reemplazo sobre el avatar interno de Medusa.

## 4. Diagnóstico y alcance

Problemas detectados y corregidos:

- Fondo global con patrón de huellas que competía con el contenido.
- Header y footer con estilos de starter, no de tienda premium.
- Dos sistemas de categorías duplicados en la home.
- Tarjetas de producto con proporción `9/16` demasiado alta y poca jerarquía de precio/marca.
- Ficha de producto en tres columnas, incómoda en desktop y con poca jerarquía de compra.
- Valores de opción huérfanos: botones que nunca podían formar una variante válida.
- Filtro de etapa de vida con un valor `all` duplicado que generaba dos radios con la misma etiqueta y el mismo `id`.
- Carrito mostrando `S/ 0.00` de envío antes de existir un método, lo que se leía como envío gratis.
- Checkout mostrando `, PE` y el check de dirección completa cuando la dirección solo tenía el país.
- Título de carrito en inglés (`Cart`) y favicon/manifest antiguos.
- Admin sin español por defecto en una sesión nueva.

Alcance respetado: Medusa, PostgreSQL, Redis, MinIO, auth, RBAC, catálogo, inventario, carrito, órdenes, publishable key, categorías, API de productos e imágenes se mantuvieron. No se habilitó Culqi ni pagos reales. No se inventaron precios, descuentos, tarifas, transportistas ni afirmaciones comerciales.

## 5. Archivos modificados

No hay `.git` en el repositorio, por lo que no existe `git diff` ni estado de commits. La lista se reconstruyó por área y por fecha de modificación.

| Área | Archivos principales |
|---|---|
| Sistema de diseño | `apps/storefront/src/styles/globals.css`, `apps/storefront/tailwind.config.js`, `apps/storefront/src/app/layout.tsx` |
| Header y footer | `.../layout/templates/nav/index.tsx`, `.../layout/components/announcement-bar/index.tsx`, `.../layout/templates/footer/index.tsx`, `.../layout/components/search/index.tsx`, `.../layout/components/cart-dropdown/index.tsx`, `.../layout/components/nav-wishlist/index.tsx` |
| Home | `.../home/components/hero/hero-carousel/index.tsx`, `.../home/components/category-showcase/index.tsx`, `.../home/components/product-rail/index.tsx`, `.../home/components/product-rail/skeleton.tsx`, `.../product-rail/rail-tabs/index.tsx`, `.../product-rail/rail-arrows/index.tsx`, `.../home/components/trust-strip/index.tsx`, `.../home/components/secondary-banner/index.tsx`, `.../home/components/home-sections/index.tsx`, `apps/storefront/src/lib/home-config.ts` |
| Catálogo | `.../store/templates/index.tsx`, `.../store/templates/catalogue-results.tsx`, `.../store/components/catalogue/filter-panel.tsx`, `.../filter-sheet.tsx`, `.../filters.tsx`, `.../sort-control.tsx`, `apps/storefront/src/lib/catalogue/search.ts` |
| Producto | `.../products/templates/index.tsx`, `.../products/templates/product-info/index.tsx`, `.../products/components/product-actions/index.tsx`, `.../product-actions/option-select.tsx`, `.../product-actions/quantity-input.tsx`, `.../product-actions/mobile-actions.tsx`, `.../products/components/image-gallery/index.tsx`, `.../products/components/product-pet-info/index.tsx`, `.../products/components/product-tabs/index.tsx`, `.../product-tabs/accordion.tsx`, `.../products/components/thumbnail/index.tsx`, `.../products/components/product-preview/index.tsx`, `.../products/components/product-price/index.tsx`, `apps/storefront/src/lib/util/product.ts` |
| Carrito y checkout | `.../cart/templates/index.tsx`, `.../common/components/cart-totals/index.tsx`, `.../checkout/components/addresses/index.tsx`, `apps/storefront/src/app/[countryCode]/(main)/cart/page.tsx`, `apps/storefront/src/app/[countryCode]/(checkout)/checkout/page.tsx` |
| Cuenta y login | `.../account/templates/login-template.tsx`, `.../account/templates/account-layout.tsx`, `.../account/components/login/index.tsx`, `.../account/components/register/index.tsx`, `.../account/components/google-button/index.tsx`, `.../common/components/input/index.tsx` |
| i18n | `apps/storefront/src/lib/i18n/translations.ts` |
| Iconos y PWA | `apps/storefront/src/app/manifest.ts`, `apps/storefront/src/app/icon.svg`, `apps/storefront/src/app/favicon.ico`, `apps/storefront/src/app/apple-icon.png`, `apps/storefront/public/apple-touch-icon.png`, `apps/storefront/public/demo/accesorio.svg`, `apps/storefront/public/favicon.ico` |
| Admin | `apps/backend/medusa-config.ts`, `apps/backend/src/lib/admin-language.ts`, `apps/backend/src/lib/__tests__/admin-language.unit.spec.ts`, `apps/backend/src/admin/i18n/index.ts`, `apps/backend/src/admin/i18n/json/es.json`; se conservaron las rutas y widgets oficiales existentes |

## 6. Componentes nuevos

Archivos nuevos:

- `apps/storefront/src/app/manifest.ts`: manifest PWA real, con `lang: es-PE`, `start_url: /pe`, colores de marca e iconos de huella.
- `apps/storefront/src/app/apple-icon.png`: icono Apple de 180×180 generado desde la huella.
- `apps/storefront/public/apple-touch-icon.png`: copia en la ruta convencional para compatibilidad con iOS antiguo.

Bloques nuevos dentro de componentes existentes:

- Collage decorativo y badge flotante del hero.
- Tarjeta final “Ver todo” en los rieles.
- Tarjeta de beneficios de cuatro columnas.
- Tarjetas de categoría tintadas con ilustración.
- Afinidad “Ver producto” en las tarjetas.
- Estado “Por calcular” del envío.
- Placeholders de dirección/contacto del checkout y helper `AddressLines`.

No se creó un panel de administración paralelo, una librería de componentes duplicada ni un sistema de diseño alterno. Se reutilizaron los componentes y las extensiones existentes.

## 7. Home, catálogo y login

### Home

- Header crema/blanco con logo oficial intacto, buscador redondeado, acciones en píldora, favoritos y carrito.
- Barra de anuncio verde petróleo.
- Hero editorial con bowl como imagen principal, collage de huella/salud/higiene, badge “Compra con confianza / Atención personalizada”, CTA principal y CTA secundario.
- Se eliminó el segundo sistema de categorías (`CircularCategoryRow`); ahora hay un solo `CategoryShowcase` con `id="categorias"` y offset de scroll.
- Seis categorías: Alimentos, Salud, Higiene, Accesorios, Juguetes, Farmacia.
- Rieles “Productos del mes”, “Nuevos productos” y “Ofertas” con pestañas en píldora, flechas, skeleton coherente y tarjeta “Ver todo”.
- Franja de beneficios con cuatro mensajes reales, todos pasados por `t()`.
- Banner secundario en verde salvia con CTA verde petróleo.
- Footer con banda de cierre verde petróleo, cuerpo crema, logo oficial, nota de placeholder y “Métodos de pago: Pendientes de confirmación.”.

### Catálogo

- Encabezado premium con título, descripción y contador.
- Sidebar de filtros en tarjeta blanca: categoría, precio, marca, especie, etapa de vida y disponibilidad.
- Filtros móviles en hoja deslizante con disparador redondeado.
- Barra de resultados blanca, ordenamiento y paginación.
- Estado vacío y estado de carga conservados.
- Se corrigió el valor `all` duplicado de etapa de vida: ahora solo queda el radio de reinicio “Todas las etapas”.
- La búsqueda y el ordenamiento siguen usando la URL y el estado existente.

### Login

- Tarjeta centrada debajo del header, responsive, blanca, redondeada, con borde y sombra sutiles.
- Título en Fredoka, eyebrow “TU CUENTA FANCY PETS”, inputs redondeados y botón de marca.
- Foco visible en inputs, enlaces y botones.
- Se mantuvo el proveedor de Google y toda la lógica de autenticación; no se cambió auth, sesión ni proveedores.

## 8. Carrito y checkout

- El layout del carrito pasó de un espacio de `160px` a `48px`, dando más ancho a la tabla y equilibrándolo con el resumen.
- `CartTotals` muestra “Por calcular” mientras `shipping_methods` esté vacío. Ya no se muestra `S/ 0.00` como si fuera envío gratis. Cuando exista un método real, se muestra el `shipping_subtotal` real, incluido un `S/ 0.00` legítimo si el método es gratuito.
- El checkout dejó de imprimir `, PE` cuando la dirección solo tenía el país.
- El check de “Dirección de envío” solo aparece cuando hay contenido real de dirección.
- Si la dirección está vacía, se muestra “Agrega tu dirección de envío.”; si no hay contacto, “Sin datos de contacto.”; si falta facturación, “Agrega tu dirección de facturación.”.
- No se modificaron pagos, auth, órdenes ni la lógica de creación de carrito.
- No se realizó ningún pedido real durante las pruebas.

## 9. Ficha de producto

- Layout de dos columnas: galería sticky a la izquierda; compra y datos a la derecha.
- Galería con imagen grande y miniaturas operables por teclado.
- Título, subtítulo, precio grande, stock en píldora, botones de opción redondeados, control de cantidad y botón de compra.
- Selección de variante explícita: con más de una variante no se preselecciona nada; el botón dice “Elegir variante” hasta que la selección forme una variante válida.
- Sincronización de `?v_id=` para que la galería siga la variante elegida.
- Límite de cantidad según stock real de la variante.
- Valores de opción filtrados a los que existen en al menos una variante compatible; se eliminan botones huérfanos.
- Pestañas/acordeón de Descripción y Detalles.
- Tarjeta de información de mascota: marca, especie, etapa de vida y tamaño recomendado.
- Productos relacionados con las mismas tarjetas premium.
- Migas de pan y CTA “Ver producto”.

## 10. Estado del español

- Todo el UI tocado usa `t()` y el diccionario central `apps/storefront/src/lib/i18n/translations.ts`.
- Se añadieron claves para hero, categorías, rieles, beneficios, footer, cabecera de tienda, migas, galería, CTA de producto, login, envío pendiente, pagos pendientes y placeholders de checkout.
- La auditoría de claves no encontró duplicados.
- La auditoría de cadenas visibles en los componentes tocados no encontró inglés hardcodeado.
- El título local del carrito es “Carrito”; el de staging antiguo sigue siendo “Cart” hasta desplegar.
- El footer local dice “Cuidado veterinario para tu mejor amigo.”; staging antiguo conserva el typo “Cuidado veterinary…”.
- El Admin usa español por defecto mediante un plugin oficial; el selector de idioma oficial sigue funcionando.

Pendiente de autorización, no traducido ni eliminado:

- Productos y categorías demo en inglés del catálogo de staging (`Medusa Shorts`, `Medusa Sweatpants`, `Medusa T-Shirt`, `Medusa Sweatshirt`, `Shirts`, `Sweatshirts`, `Pants`, `Merch`).
- Thumbnails demo antiguos servidos por el backend de staging, incluido el `accesorio.svg` viejo con forma de símbolo de género en algunos productos. La tarjeta de categoría “Accesorios” sí usa el nuevo SVG local con forma de collar.
- Nombres, descripciones, precios y datos comerciales de Medusa: no se alteraron.

## 11. Favicon

El favicon es una huella separada del logotipo oficial, no el wordmark. Es una huella verde petróleo sobre cuadrado amarillo redondeado, con una F calada, legible a tamaño pequeño.

Evidencia local:

- `/favicon.ico`: `200`, `image/x-icon`, 1.609 bytes; contiene 16×16 y 32×32.
- `/icon.svg`: `200`, `image/svg+xml`, 767 bytes.
- `/apple-icon.png`: `200`, `image/png`, 5.582 bytes, 180×180.
- `/apple-touch-icon.png`: `200`, `image/png`, 5.582 bytes, 180×180, tras reiniciar el servidor local con el archivo en `public/`.
- `/manifest.webmanifest`: `200`, `application/manifest+json`, 481 bytes.

Head generado por Next.js:

```html
<link rel="manifest" href="/manifest.webmanifest"/>
<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16"/>
<link rel="icon" href="/icon.svg?aca37c95d58231e9" type="image/svg+xml" sizes="any"/>
<link rel="apple-touch-icon" href="/apple-icon.png?c6b091755755ba7f" type="image/png" sizes="180x180"/>
```

Precedencia y caché:

- El ICO es el fallback clásico; el SVG es el icono moderno; el Apple icon cubre iOS; el manifest cubre PWA.
- Next.js añade hash a las URLs del SVG y del Apple icon, por lo que un build nuevo invalida la caché de esos assets.
- El ICO se sirve sin hash; el navegador puede cachearlo, pero el despliegue reemplaza el archivo y el tamaño cambia de 25.931 a 1.609 bytes.
- Se conservó el `public/favicon.ico` legado y se añadió la ruta convencional `public/apple-touch-icon.png`.

Staging antiguo:

- `/favicon.ico`: 25.931 bytes, 4 iconos.
- `/icon.svg`, `/apple-icon.png` y `/manifest.webmanifest`: devuelven `text/html` por el catch-all, no los assets nuevos.

## 12. Admin: mejoras y limitaciones

Se trabajó solo con mecanismos oficiales de Medusa Admin 2.21.2. No se editó `node_modules` ni archivos generados del framework.

Extensiones oficiales conservadas:

- Rutas: `/app/marca` (branding) y `/app/brands` (CRUD de marcas).
- Widgets: `login.before` (branding de login), `product.details.side.after` (marca y datos de mascota), `order.details.side.after` (pago manual).
- Enlaces de sidebar y helpers de consulta/UI compartidos.
- Override de i18n en `src/admin/i18n/json/es.json` para cadenas propias del proyecto, sin parchear el dashboard.

Mejora añadida/verificada:

- Plugin oficial de Vite `fancy-pets-admin-language` que siembra `lng=es` en cookie/localStorage solo cuando no existe preferencia. Un operador que eligió inglés conserva inglés; el selector oficial de idioma sigue funcionando.
- El HTML construido localmente contiene `localStorage.setItem("lng", "es")`; el Admin de staging no lo contiene.

Limitaciones:

- Medusa no expone una zona oficial para inyectar un dashboard completo. Un reemplazo total del Admin no está soportado y no se construyó.
- El avatar/logo interno del login del dashboard es un SVG inline, no una cadena i18n. Las zonas oficiales `login.before`/`login.after` agregan contenido, pero no eliminan ese avatar. Reemplazarlo exigiría forkear la ruta de login, fuera de alcance.
- La verificación runtime completa del Admin en español requiere un Admin construido y login activo; la inyección en el HTML se verificó, pero staging aún no está desplegado.
- El Admin no se re-skineó como el storefront; se mantiene el dashboard oficial para preservar RBAC, catálogo, inventario, órdenes y pagos.

## 13. Build, lint y tests

Storefront:

- `corepack pnpm exec tsc --noEmit`: pasa sin errores.
- `corepack pnpm run lint` (`next lint`): pasa sin warnings ni errores. `next lint` está deprecado en Next 16; se usó el script existente.
- `corepack pnpm run build`: pasa. Genera `/manifest.webmanifest`, `/icon.svg`, `/apple-icon.png`, `/opengraph-image.jpg`, `/twitter-image.jpg` y el middleware de 33,1 kB.
- Existe un warning ambiguo preexistente de Tailwind por `motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]`; no bloquea el build.

Backend:

- `corepack pnpm run lint` (`medusa lint`): 0 errores, 38 warnings preexistentes (mutaciones de servicio en rutas API y usos de `Error`/montos en `staging-financial-e2e.ts`). No se añadieron errores nuevos.
- `corepack pnpm run build` (`medusa build`): backend 15,36 s, frontend 44,06 s, éxito. El Admin construido incluye la inyección de español.
- `corepack pnpm run test:unit`: 12 suites, 164 tests, todos pasan.
- No se ejecutaron tests de integración porque requieren PostgreSQL vivo y no se quiso alterar la base ni rerun de seeds. No se ejecutó ningún pedido real.

Verificación real con Chromium/CDP en local:

- Las opciones de variante se habilitan tras la hidratación.
- Al seleccionar `2 kg`, `aria-pressed` pasa a `true`.
- El botón de compra se habilita.
- Stock: “Disponible”. Precio: `S/ 69.00`.
- Feedback: “Producto agregado al carrito”.
- El carrito contiene el artículo.
- El checkout carga el paso de dirección.
- No se completó ningún pedido.

## 14. Capturas

Ruta: `/home/ivan/opencode-shots/redesign/`

| Archivo | Contenido |
|---|---|
| `home-final.png` | Home desktop full page, 1440×5214: header, hero, beneficios, categorías, rieles, banner y footer |
| `home-mobile-final.png` | Home móvil: header, hero, beneficios, categorías, rieles y footer |
| `store-final.png` | Catálogo desktop, 1440×2553: filtros, resultados, orden, grilla y paginación |
| `product-before.png` | Ficha de producto antes de elegir variante |
| `product-selected.png` | Ficha con `2 kg` seleccionado, precio y stock |
| `product-added.png` | Ficha con feedback de producto agregado |
| `product-desktop.png` | Ficha full page: dos columnas, pestañas y relacionados |
| `cart-final.png` | Carrito con artículo, “Envío Por calcular” y resumen |
| `checkout-final.png` | Checkout con “Agrega tu dirección de envío.” y “Sin datos de contacto.” |
| `account-final.png` | Login centrado, tarjeta blanca y botón de marca |
| `favicon-16.png` | Huella a 16×16 |
| `favicon-32.png` | Huella a 32×32 |
| `favicon-ico-32.png` | Frame 32×32 del ICO |

Las capturas son reales, tomadas con Chromium/CDP contra el build local final3 y el backend de staging. No son capturas del staging desplegado, porque staging sigue sirviendo la build anterior.

## 15. Diffs clave

### Envío pendiente en lugar de `S/ 0.00`

```ts
const hasShippingMethod = (shipping_methods?.length ?? 0) > 0

{hasShippingMethod
  ? convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })
  : t("cart.shippingPending")}
```

### Etapa de vida sin el valor `all` duplicado

```ts
const lifeStages = readFacetValues(response, "life_stage")
  .filter((entry) => entry.value !== "all")
  .map((entry) => ({
    value: entry.value,
    label: lifeStageLabel(entry.value) ?? entry.value,
    count: entry.count,
  }))
```

### Solo valores de opción que forman una variante

```ts
// getAvailableOptionValues(): recorre las variantes compatibles con las demás
// opciones seleccionadas y solo devuelve los valores que existen en alguna.
const variantValue = variantOptions.find(
  (variantOption) => variantOption.option_id === option.id
)?.value

if (variantValue) {
  values.add(variantValue)
}
```

### Checkout sin `, PE` ni check falso

```ts
const hasAddressContent = (address?: HttpTypes.StoreCartAddress | null) =>
  Boolean(
    address &&
      (address.first_name ||
        address.last_name ||
        address.address_1 ||
        address.address_2 ||
        address.city ||
        address.postal_code)
  )

const hasShippingAddress = hasAddressContent(cart?.shipping_address)
```

### Manifest PWA

```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fancy Pets",
    short_name: "Fancy Pets",
    lang: "es-PE",
    start_url: "/pe",
    display: "standalone",
    background_color: "#FBF7F0",
    theme_color: "#00546C",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/favicon.ico", sizes: "16x16 32x32", type: "image/x-icon" },
    ],
  }
}
```

### Español por defecto en Admin, sin quitar el selector oficial

```ts
if (!hasCookie && !stored) {
  window.localStorage.setItem("lng", "es")
  document.cookie = "lng=es; path=/; max-age=31536000; SameSite=Lax"
}
```

## 16. Estado del despliegue, pendientes y próximos pasos

### Estado

No se desplegó. El staging sigue con la build anterior. Evidencia:

- `/pe` conserva el typo “Cuidado veterinary para tu mejor amigo.” y el texto de pagos antiguo.
- `/pe/account` no muestra el nuevo eyebrow “TU CUENTA FANCY PETS”.
- `/pe/cart` sigue titulando “Cart”.
- `/favicon.ico` sigue siendo el antiguo de 25.931 bytes y 4 iconos.
- `/icon.svg`, `/apple-icon.png` y `/manifest.webmanifest` devuelven `text/html` por el catch-all, no los assets nuevos.
- El Admin de staging no contiene la inyección `lng=es`.

No se pudo desplegar como usuario `ivan`: el socket de Docker deniega el acceso y `sudo` requiere autenticación interactiva; no hay token/CLI de Dokploy disponible. No se intentó eludir esa restricción.

Producción Dell `192.168.1.36` no se tocó. No se recrearon PostgreSQL, Redis ni MinIO. No se borraron volúmenes. No se rerun de seeds. No se cambiaron credenciales.

### Comando exacto para el operador

El key de staging debe estar en `$STAGING_PK` (variable de entorno del operador, leída del entorno de Dokploy; no se imprime aquí):

```bash
cd /home/ivan/fancyperu-src

sudo SRC=/home/ivan/fancyperu-src TARGET=all \
  API_DOMAIN=api.192.168.1.38.nip.io \
  STOREFRONT_DOMAIN=shop.192.168.1.38.nip.io \
  PUBLIC_SCHEME=http \
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$STAGING_PK" \
  sh deploy/dokploy/build-images.sh
```

El script construye secuencialmente `fancyperu-backend:dokploy` y `fancyperu-storefront:dokploy`. Se usa `TARGET=all` porque el cambio de español del Admin requiere backend. No ejecuta seeds ni borra volúmenes.

Después, en Dokploy, abrir el proyecto `fancyperu-test-k6cmve` y usar “Redeploy” para recrear `fancyperu-backend` y `fancyperu-storefront` con las imágenes nuevas. No recrear `fancyperu-db`, `fancyperu-redis` ni `fancyperu-minio`.

Verificación read-only:

```bash
cd /home/ivan/fancyperu-src
sudo PROJECT=fancyperu-test-k6cmve sh deploy/dokploy/verify-test-deploy.sh
```

URLs a verificar después del redeploy:

- `http://shop.192.168.1.38.nip.io/pe`
- `http://shop.192.168.1.38.nip.io/pe/store`
- `http://shop.192.168.1.38.nip.io/pe/account`
- `http://shop.192.168.1.38.nip.io/pe/cart`
- `http://shop.192.168.1.38.nip.io/pe/checkout` (con carrito)
- `http://shop.192.168.1.38.nip.io/pe/products/alimento-cachorro`
- `http://shop.192.168.1.38.nip.io/favicon.ico`
- `http://shop.192.168.1.38.nip.io/icon.svg`
- `http://shop.192.168.1.38.nip.io/apple-icon.png`
- `http://shop.192.168.1.38.nip.io/apple-touch-icon.png`
- `http://shop.192.168.1.38.nip.io/manifest.webmanifest`
- `http://api.192.168.1.38.nip.io/app`

### Pendientes

- Desplegar a staging y repetir la verificación real en staging, no solo en local.
- Verificar runtime del Admin: login, español por defecto, selector de idioma, `/app/marca`, `/app/brands`, widgets de producto y widget de pago manual.
- Autorizar y limpiar datos demo: productos/categorías en inglés y thumbnails demo antiguos. Sin autorización no se traducen ni eliminan.
- Definir fotografía real de mascotas y contenido comercial definitivo; no se inventaron precios, descuentos, envíos, transportistas ni afirmaciones.
- Configurar métodos de envío reales si se desea que el carrito deje de mostrar “Por calcular”.
- No habilitar Culqi ni pagos reales sin una decisión explícita.
- Inicializar Git y hacer un commit antes del despliegue para tener rollback y diff real.
- Ejecutar tests de integración contra una base descartable si se requiere cobertura adicional.

### Conclusión

El rediseño está implementado y verificado localmente: compila, pasa lint, pasa tests unitarios y las interacciones reales de variante, carrito y checkout funcionan. El logo oficial quedó intacto, el favicon es una huella separada, el español cubre el UI tocado y el Admin se mantuvo dentro de los mecanismos oficiales de Medusa.

El único bloqueo para cerrar la entrega es el despliegue a staging, que requiere sudo/Dokploy y no se ejecutó por las restricciones del entorno. Los comandos exactos quedan arriba para que el operador los ejecute.
