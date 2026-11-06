# Fase 2 — Perfeccionamiento visual Fancy Pets

Estado: **listo para revisión, sin desplegar**. Actualizado el 30/10/2026 tras una segunda pasada de verificación sobre el build local.

Servidor local de revisión: `http://127.0.0.1:3001/pe` (build de producción, API de staging en solo lectura).

---

## 0. Segunda pasada (30/10/2026)

Esta pasada cerró los dos puntos que quedaban abiertos y volvió a medir el resultado:

- **Riel «Productos del mes» sin hueco.** La colección `destacados` solo tiene dos productos. En lugar de ocultar la sección o estirar una tarjeta vacía, la tarjeta final «Ver todo» se convierte en un **panel editorial** que ocupa el ancho restante desde 1024 px. Por debajo de 1024 px conserva la tarjeta compacta dentro del carrusel. No se tocaron datos ni la colección.
- **CTAs del hero realmente distintos.** El segundo slide ya no repite «Ver categorías»: ahora ofrece **«Ver cuidados» → `/pe/categories/salud`**. El primer slide mantiene «Ver categorías» → `/pe#categorias`. Ningún par de CTAs del hero comparte texto y destino.
- **Desbordamiento a 1024 px corregido.** La píldora «Liquidación» del menú sobresalía 5 px a ese ancho. Se compactó el espaciado de la navegación entre 1024 y 1279 px; a 1280 px vuelve el espaciado original.
- **Verificación funcional sin escrituras.** Filtro de categoría (12 → 5 productos), orden por precio ascendente y selección de variante «2 kg» (habilita «Agregar al carrito»). No se añadió nada al carrito ni se envió el formulario de acceso.

**Nota de entorno:** el host había perdido el binario de Node desde la sesión anterior. Se instaló una copia local en `~/.local/node22` (Node 22.22.0 + pnpm 10.11.1) solo para ejecutar lint, build y el servidor de revisión. No se modificó el sistema ni el proyecto por ello.

---

## 1. Qué se corrigió

### 1.1 Hero
- Se sustituyeron las ilustraciones que se leían como "pelota deportiva" y "tazón gigante" por **ilustraciones vectoriales propias** (`public/hero/`): un perro y un gato juntos, con variante espejada para el segundo slide. Sin fotos de stock, sin licencias de terceros y sin hotlinking: los SVG viven en el repositorio.
- Se eliminaron los degradados superpuestos y las tarjetas flotantes que ensuciaban la composición. Queda una sola **píldora de confianza** ("Compra con confianza · Atención personalizada"), oculta la segunda frase por debajo de 512 px para no tapar a las mascotas.
- Arte distinto para escritorio y móvil (`pets-duo-desktop/mobile`, `pets-care-desktop/mobile`) con recorte propio, de modo que a 375 px las caras no quedan diminutas.
- Ambas imágenes del carrusel se cargan con prioridad: el segundo slide ya no aparece en blanco al deslizarse.

### 1.2 CTA duplicados
Antes, el segundo slide mostraba dos veces "Ver categorías" con destinos distintos. Ahora cada slide tiene un CTA primario y uno secundario con texto y destino diferentes, y ningún CTA del hero repite el par texto/destino de otro:

| Slide | CTA primario | Destino | CTA secundario | Destino |
|---|---|---|---|---|
| Cuidado diario | Explorar productos | `/pe/store` | Ver categorías | `/pe#categorias` |
| Bienestar diario | Ver alimentos | `/pe/categories/alimentos` | Ver cuidados | `/pe/categories/salud` |

Rutas comprobadas en local: `/pe/store` → 200, `/pe/categories/alimentos` → 200, `/pe/categories/salud` → 200, ancla `#categorias` presente en el DOM. El CTA «Ver todas las categorías» de la sección de categorías mantiene un texto distinto y apunta a `/pe/store`, que también responde 200.

Los slides inactivos llevan `inert` y `aria-hidden`, así que sus CTAs no están en el árbol de accesibilidad ni en el orden de tabulación: nunca se anuncian dos veces.

### 1.3 Tarjetas de categoría
- Tarjetas más grandes, número de orden, título y CTA con jerarquía clara.
- Estados hover/pressed, borde y sombra consistentes, anillo `focus-visible` para teclado.
- CTA "Ver categoría" con flecha y color de texto con contraste AA sobre cada fondo tintado.

### 1.4 Tarjetas de producto
- Zoom suave de la imagen al pasar el ratón, sin desplazar el layout.
- Anillo de foco visible en la tarjeta completa, en el botón de favoritos y en los enlaces "Ver todo".
- Precio en `brand-700` (antes ámbar claro, ilegible sobre blanco).
- Badge de descuento en rojo oscuro: blanco sobre `accent-700` da 5.83:1 (antes 3.70:1).
- Flechas de los carruseles: solo se muestran cuando hay contenido que desplazar; antes apuntaban a la nada en rieles con dos productos.

### 1.5 Banner "Cuidado diario"
Sustituido el icono de gota ampliado por una **ilustración flat-lay propia** (`public/hero/care-kit.svg`): champú, cepillo, toalla, comedero y cepillo dental, en la paleta de la marca. Era el elemento que más rompía el acabado premium.

### 1.6 Contraste y accesibilidad
El naranja interactivo anterior (`#bd6212`) daba **4.27:1** sobre blanco y **3.57:1** sobre los tintes de categoría (mínimo AA: 4.5:1). En lugar de fijar un color a mano, `lib/branding.ts` ahora **deriva los tonos interactivos** del color configurado por el Admin hasta alcanzar 5.6:1, y genera pasos 800/900 más oscuros (los estados hover antes eran invisibles porque los cuatro tokens apuntaban al mismo valor). El color decorativo original se conserva en los pasos 400/500.

Contraste medido en el navegador (1440 px):

| Elemento | Combinación | Ratio |
|---|---|---|
| Precio | `#a0530d` sobre blanco | 5.62:1 |
| CTA de categoría | `#a0530d` sobre tinte cálido | 4.70:1 |
| CTA de categoría | `#a0530d` sobre tinte verde/azul | 4.86:1 |
| Botón primario | blanco sobre `#a0530d` | 5.62:1 |
| Badge de oferta | blanco sobre `#ba3424` | 5.83:1 |
| Texto secundario | `#746f66` sobre blanco | 4.99:1 |

### 1.7 Riel «Productos del mes» sin hueco (30/10)
La colección `destacados` tiene dos productos y el riel dejaba media fila vacía. La tarjeta final ahora detecta que el riel es disperso (`productos + CTA ≤ 3`) y:

- de 1024 px en adelante, se expande con `flex-1` y se convierte en un panel editorial: antetítulo, «Descubre toda la selección», texto de apoyo, botón «Explorar catálogo» y un sello de huella decorativo;
- por debajo de 1024 px, mantiene la tarjeta compacta centrada dentro del carrusel, para no meter un bloque de texto ancho en una columna de 220 px;
- el riel sigue siendo un scroller nativo en móvil y tablet; las flechas y los puntos solo aparecen si hay desbordamiento real.

A 768 px las tres tarjetas (dos productos + CTA) miden 220 px y suman exactamente el ancho del contenedor, sin recortes ni scroll horizontal. A 1440 px el panel ocupa los 776 px restantes y la fila queda completa.

### 1.8 Navegación a 1024 px (30/10)
La píldora «Liquidación» sobresalía 5 px en el ancho exacto de 1024 px. Se redujo el padding de los enlaces y el espacio entre ellos solo entre 1024 y 1279 px (`px-3` / `gap-x-1`), restaurando `px-3.5` / `gap-x-1.5` desde 1280 px. Medición final: `scrollWidth − clientWidth = 0` a 1024, 1280 y 1440 px.

---

## 2. Archivos modificados

**Ilustraciones nuevas**
- `apps/storefront/public/hero/pets-duo-desktop.svg`
- `apps/storefront/public/hero/pets-duo-mobile.svg`
- `apps/storefront/public/hero/pets-care-desktop.svg`
- `apps/storefront/public/hero/pets-care-mobile.svg`
- `apps/storefront/public/hero/care-kit.svg`

**Configuración y textos**
- `apps/storefront/src/lib/home-config.ts` — arte del hero, imágenes por slide, CTA "Ver alimentos", CTA secundario "Ver cuidados" del slide 2, imagen del banner.
- `apps/storefront/src/lib/i18n/translations.ts` — textos alternativos del hero y del banner, CTAs del slide 2 y textos del panel final del riel.

**Componentes**
- `apps/storefront/src/modules/home/components/hero/hero-carousel/index.tsx` — nuevo arte, sin overlays ni stickers, píldora de confianza, carga prioritaria, sombra del CTA, CTA secundario por slide.
- `apps/storefront/src/modules/home/components/category-showcase/index.tsx` — refinamiento de tarjetas.
- `apps/storefront/src/modules/products/components/product-preview/index.tsx` — foco de tarjeta, badge de oferta accesible.
- `apps/storefront/src/modules/products/components/thumbnail/index.tsx` — zoom de imagen.
- `apps/storefront/src/modules/products/components/product-preview/price.tsx` — color de precio.
- `apps/storefront/src/modules/common/components/wishlist-button/index.tsx` — anillo de foco.
- `apps/storefront/src/modules/home/components/product-rail/index.tsx` — foco, flecha del enlace final, panel editorial para rieles dispersos y anchos de tarjeta a 768 px.
- `apps/storefront/src/modules/home/components/product-rail/rail-arrows/index.tsx` — flechas condicionadas al desbordamiento real.
- `apps/storefront/src/modules/layout/templates/nav/index.tsx` — espaciado compacto de la navegación entre 1024 y 1279 px.
- `apps/storefront/src/modules/account/components/login/index.tsx` y `apps/storefront/src/modules/common/components/ui/index.tsx` — sombra del botón primario alineada al nuevo tono.

**Sistema de color**
- `apps/storefront/src/styles/globals.css` — tokens de respaldo (`brand-700`, `fg-muted`) y comentario con los ratios.
- `apps/storefront/src/lib/branding.ts` — derivación de tonos accesibles conservando la personalización desde el Admin.

**Solo en la segunda pasada (30/10/2026)**
- `apps/storefront/src/modules/home/components/product-rail/index.tsx`
- `apps/storefront/src/modules/home/components/hero/hero-carousel/index.tsx`
- `apps/storefront/src/lib/home-config.ts`
- `apps/storefront/src/lib/i18n/translations.ts`
- `apps/storefront/src/modules/layout/templates/nav/index.tsx`

El componente del logo (`src/modules/common/components/fancy-pets-logo/index.tsx`) no se modificó: su fecha de modificación sigue siendo anterior a la fase 2 y su SHA-256 coincide byte a byte con el del tarball previo (`32b11cbc…`).

---

## 3. Verificación ejecutada

- `pnpm run lint` (Next ESLint): **sin errores ni advertencias**.
- `pnpm run build`: **compilación correcta** (solo queda el warning preexistente de la clase ambigua `motion-safe:ease-[...]`, ajeno a esta fase).
- Revisiones de rutas (solo GET, sin escrituras):

| Ruta | Resultado |
|---|---|
| `/pe` | 200 |
| `/pe/store` | 200 |
| `/pe/categories/alimentos` | 200 |
| `/pe/categories/salud` | 200 |
| `/pe/products/alimento-cachorro` | 200 |
| `/pe/cart` | 200 (vacío) |
| `/pe/account` | 200 (login) |
| `/pe/checkout` | 307 → `/pe/cart` (correcto con carrito vacío) |

- **Interacción comprobada sin escribir datos:**
  - Filtro «Alimentos» en `/pe/store`: 12 → 5 productos, URL `?category=alimentos`.
  - Orden «Precio: menor a mayor»: primera página pasa de `S/ 43.00` a `S/ 18.00`, `19.00`, `21.00`, `22.00`, `24.00`; URL `?sort=price_asc`.
  - Ficha de producto: al pulsar «2 kg», el botón pasa de «Elegir variante» (deshabilitado) a «Agregar al carrito» (habilitado). No se pulsó para no crear un carrito.
  - Carrito vacío y login renderizan sus estados y formularios; no se envió el formulario ni se creó sesión.
- **Cero errores de consola** en todas las páginas capturadas.
- **Cero desbordamiento horizontal** (`scrollWidth − clientWidth = 0`) a **375, 768, 1024, 1280 y 1440 px**.
- **CTAs del hero verificados en el DOM:** slide 1 «Explorar productos» → `/pe/store` + «Ver categorías» → `/pe#categorias`; slide 2 «Ver alimentos» → `/pe/categories/alimentos` + «Ver cuidados» → `/pe/categories/salud`. Los slides inactivos son `inert` + `aria-hidden`.
- Las cinco ilustraciones del hero y el kit de cuidado se sirven en local (200). No hay hotlinking ni peticiones a CDNs de imágenes.
- No se ejecutaron migraciones, seeds ni comandos destructivos. No se modificaron precios, pagos, Docker Compose ni el servidor de producción `192.168.1.36`.

**Sobre las imágenes de producto en las capturas:** los productos del staging guardan URLs absolutas a `http://shop.192.168.1.38.nip.io/demo/*`. Ese dominio devolvió 404 durante esta revisión (el API sí respondió 200 en `http://api.192.168.1.38.nip.io`). Para que las capturas mostraran el diseño real, el navegador de capturas interceptó **solo esas peticiones** y sirvió los mismos SVG desde `apps/storefront/public/demo/`. No se modificó ningún dato ni archivo del backend. Antes de desplegar conviene comprobar que el dominio de la tienda vuelve a servir `/demo/*`.

---

## 4. Capturas

Directorio: `/home/ivan/opencode-shots/p2-final/`

**Escritorio (1440)**
- `hero-1440-slide1.png` — hero, slide 1, CTAs «Explorar productos» y «Ver categorías».
- `hero-1440-slide2.png` — hero, slide 2, CTAs «Ver alimentos» y «Ver cuidados».
- `home-1440-final2.png` — página completa.
- `store-1440-v3.png` — catálogo con filtros, 18 productos.
- `product-1440-v3.png` — ficha de producto y relacionados.
- `cart-1440-v3.png` — carrito vacío.
- `account-1440-v3.png` — inicio de sesión.

**Tablet (768)**
- `home-768-v3.png` — página completa; riel destacado con tres columnas de 220 px.
- `store-768.png`
- `product-768.png`
- `cart-768.png`
- `account-768.png`

**Móvil (375)**
- `hero-375-slide1.png`
- `hero-375-slide2.png`
- `home-375-final2.png` — página completa.
- `store-375.png`
- `product-375.png`
- `cart-375.png`
- `account-375.png`

**Anchos intermedios**
- `home-1024-v2.png` — panel editorial del riel y navegación compacta.
- `home-1280.png` — transición al espaciado de navegación original.

---

## 5. Pendientes y decisiones para el usuario

1. **Riel «Productos del mes».** Resuelto en código: con dos productos, la tarjeta final se convierte en panel editorial desde 1024 px y la fila queda completa. Si más adelante se añaden productos a la colección `destacados`, el riel vuelve solo a la tarjeta compacta y al carrusel, sin tocar código.
2. **Fotografía real de producto.** Las fichas siguen usando los SVG de demostración (tazón, gota, etc.) y el catálogo incluye productos demo de Medusa (camisetas, pantalones). Cambiarlos implica cargar medios en el backend; no se tocó.
3. **Dominio de la tienda en staging.** `http://shop.192.168.1.38.nip.io` devolvió 404 durante esta revisión, mientras el API sí respondió. Las imágenes de producto apuntan a ese dominio, así que antes de un nuevo despliegue hay que confirmar que vuelve a servir `/demo/*` y el storefront.
4. **Colores del Admin.** Si un operador elige un `primaryDark` muy claro, la tienda lo oscurecerá automáticamente para textos y botones. Es intencional (accesibilidad), pero conviene saberlo antes de cambiar la paleta.
5. **Despliegue.** No se publicó nada. Cuando lo autorices, el cambio de `lib/branding.ts` afecta a todo el tema, no solo a la portada, así que conviene una revisión rápida de carrito y checkout en staging después del deploy.

---

## 6. Cómo revisar

El build actual está servido en `http://127.0.0.1:3001/pe` mientras el proceso siga vivo. Para levantarlo de nuevo:

```bash
cd apps/storefront
pnpm run build
pnpm exec next start -p 3001
```

Las capturas se regeneraron contra ese build con Chromium headless; el logo, el header y el footer son los originales. El logo no se redibujó ni se sustituyó: el componente `FancyPetsLogo` conserva su archivo y sus proporciones.
