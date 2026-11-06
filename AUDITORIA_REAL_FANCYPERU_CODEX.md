# FANCYPERU — AUDITORÍA REAL (Final)

> Esta auditoría fue iniciada por **OpenAI Codex** (interrumpida por límites de uso) y
> **la revisión final fue ejecutada por OpenCode** en los días 2026-10-16 / 2026-10-17,
> conservando nombres y alcance pedidos originalmente para mantener continuidad.
>
> Auditor principal: software, seguridad, pagos e-commerce y arquitectura Medusa 2.
> El código de aplicación **no fue modificado**; producción solo se inspeccionó por
> endpoints HTTP de solo lectura (sin credenciales, sin POST, sin ataques).
> Todos los hallazgos citan `archivo:línea` verificados contra el código real.

---

## 1. Resumen ejecutivo

| Pregunta | Respuesta |
| --- | --- |
| ¿Cómo vamos realmente? | Funcionalmente por encima del promedio de un fork de starter (tests, tipado, workflows reales), pero **el núcleo financiero está roto**: cada cargo cobraría ~1/100 del total real y los reembolsos dan `NaN` o devuelven 1/100. |
| ¿Qué funciona? | Typecheck y lint limpios en ambas apps, 92 tests Jest en verde, build de storefront OK, módulos y rutas implementados de verdad, compose de producción y staging coherentes entre sí, healthchecks y Redis persistente. |
| ¿Qué está incompleto? | 66 archivos modificados + 40 nuevos sin commit (incluida toda la integración Culqi), catálogo real del cliente sin cargar (quedan los 4 productos del starter), roles de administración solo de UI (RBAC sin enforcement real en el backend). |
| ¿Qué está mal? | P0-A conversión monetaria Culqi (confirmado), P0-B gate de despacho con metadata controlada por el cliente (confirmado), reembolsos rotos, webhooks sin verificación de monto ni secreto obligatorio, secreto del token de pedido con fallback hardcoded, docs que contradicen el código. |
| ¿Podemos entregar? | Parcialmente con advertencias; no para ventas públicas. |
| ¿Podemos vender? | **No.** Nota B 20/100 con Culqi sin claves, sin HTTPS público, sin catálogo real y con el cobro roto. |
| ¿Qué corregir primero? | P0-A (unidades monetarias), P0-B (gate COD server-side), secretos (P1), reindex de catálogo, commit del trabajo. |
| ¿Cuánto trabajo falta? | ~5–8 días de trabajo técnico enfocado + acciones del cliente (claves Culqi, decisión de dominio/HTTPS, confirmación de catálogo). |

---

## 2. Notas reales justificadas

### A. AVANCE TÉCNICO DEL SOFTWARE: **62/100**

- Typecheck backend/storefront con 0 errores; ESLint 0 errores (3 warnings reales).
- 92 tests Jest en verde (68 unit + 24 module/integration) y `next build` exitoso con 15 rutas SSG de producto.
- Arquitectura correcta: workflows, steps validados, middlewares file-based, módulo Culqi propio con cliente aislado (`client.ts`), tests unitarios por área.
- **P0-A FAIL verificado**: `toCulqiCentimos` no multiplica por la potencia decimal; cada sesión de pago se crea con ~1/100 del total.
- **P0-B FAIL verificado**: metadata del carrito (escribible por el cliente) viaja a la order y decide el gate de despacho.
- Reembolsos rotos (raw_amount `NaN` o sub-reembolso 100×), webhooks de Culqi sin match de monto contra la orden.
- El rol manager/developer solo vive en `user.metadata` y se lee en la UI; en backend no hay enforcement por rol.
- Scripts de test usan sintaxis POSIX `TEST_TYPE=x jest` que rompe en Windows (`ELIFECYCLE 1`).
- 106 entradas dirty en git (trabajo no protegido por versionado).
- La nota no es 100 por compilar: los P0 de cobros invalidan la operatividad real.

### B. PREPARACIÓN PARA VENTAS PÚBLICAS: **20/100**

- El cobro real NO se puede activar: claves Culqi no entregadas (BLOCKED) y **el código actual cobraría mal** (P0-A).
- Producción expuesta por HTTP en LAN (`192.168.1.36:8099` y `:9095`) sin dominio ni TLS: no apto para clientes reales en internet.
- Catálogo visible: 0 tarjetas de producto renderizadas en la home de producción (verificado por HTTP GET); la cadena índice→Store API explica cero tarjetas con contador positivo.
- Sin catálogo real cargado: quedan los 4 productos del starter (documento comercial: `FANCYPERU_RESUMEN_DATOS_PENDIENTES.md:107`).
- Sin backups declarados en ninguno de los compose de producción; sin rate-limiting; sin cookies `secure` forzadas.
- Para vender hay que resolver: P0-A, P0-B, claves Culqi, HTTPS/dominio, catálogo real, envío activo con opciones reales.

### C. PREPARACIÓN PARA ENTREGA AL CLIENTE: **45/100**

- Operación ya corriendo con Docker Compose nativo, healthchecks y Redis AOF/persistente.
- Manual operativo (HTML/PDF), ROLLBACK_AND_DISASTER_RECOVERY, plan Coolify, plantilla de catálogo cliente y flujo de importación de CSV con test.
- Docs que prometen más de lo que el repo certifica (TESTING.md niega tener test runner cuando hay 92 tests; ROLLBACK promete snapshots off-site diarios no automatizados).
- El trabajo actual no está commiteado: un error de disco o un checkout destruye la integración; el cliente no recibe versiones reproducibles.
- Entrega pospuesta hasta P0-A/P0-B y commit; el plan Coolify de TLS sigue divergente del compose en producción real.

---

## 3. Funciones completadas y probadas

| Función | Evidencia | Estado |
| --- | --- | --- |
| Typecheck backend/storefront | `pnpm exec tsc --noEmit` → 0 errores, exit 0 ambas | PASS |
| ESLint backend | `medusa lint` → 0 errores, 3 warnings de `no-service-mutations-in-api-route` | PASS (con deuda) |
| ESLint storefront | `next lint` → limpio | PASS |
| Test unit backend | `jest` → 7 suites / 68 tests passed (45.7 s), exit 0 | PASS |
| Test integration:modules | `jest` → 2 suites / 24 tests passed (Culqi provider + webhook unit spec), 22 s | PASS |
| Build storefront | `next build` exit 0; 15 rutas producto SSG | PASS |
| Bootstrap Perú (región/currency) | `bootstrap-peru.ts:35-120` región pe/pen, shipping options desde matriz | PASS (local) |
| Manual payment verify admin | `api/admin/orders/[id]/verify-manual-payment/route.ts` con audit trail, auth `user` | PASS (flujo verificado en tests) |
| Token PoP pedido | `order-token.ts` HMAC con entradas de env | PARTIAL (P1 fallback hardcode) |
| Middleware despacho protegido | `middlewares.ts:293-303` bloquea si no captured ni COD | PASS en guard HTTP / FAIL como política (P0-B) |
| Seeds por ambiente | `production-seed.ts`, `staging-seed.ts` con publishable keys por ambiente | PASS en scripts |
| Importación catálogo cliente | `import-client-catalog.ts` + `__tests__/import-client-catalog.unit.spec.ts` | PASS |
| Scripts de secretos | `rotate-and-sanitize.js`, `scan-secrets.js` | PASS (read-only docs) |

## 4. Funciones parciales

| Función | Evidencia | Estado |
| --- | --- | --- |
| Conversión monetaria Culqi | P0-A | **FAIL** |
| Reembolsos Culqi | `service.ts:262-271` `toCulqiCentimos(input.amount)` sobre raw_amount | **FAIL** (NaN o 1/100) |
| Webhooks Culqi | `webhook/route.ts:74,104-112` solo verifica y audita, no finaliza pedidos; el core `/hooks/payment/culqi` conecta event bus pero **no verifica amount contra order** y el secreto es opcional | PARTIAL |
| Categorías admin | `pet-product-species` CRUD sin enforcement role | PARTIAL |
| Inventario/variantes | estructura Medusa presente; data real no verificada en producción (BLOCKED sin credencial admin) | NOT_VERIFIED |
| Wishlist | solo localStorage (`lib/wishlist.ts:2-5`) | PARTIAL |
| RBAC manager/staff | solo UI (`settings-sidebar.tsx`, `seed-staff-accounts.ts:9-22`) | PARTIAL |
| Backup 24h off-site | doc lo promete; compose sin servicio backup; scheduling NOT_VERIFIED | PARTIAL |
| Sitemap/robots | `sitemap.ts` `Promise.allSettled` + fallback static; `robots.ts` staging disallow | PARTIAL |

## 5. Fallos comprobados

- **P0-A FAIL**: cargo ≈1/100 del total (tabla en §8.1).
- **P0-B FAIL**: metadata del cliente (`is_cash_on_delivery=true`) llega a la order y evita el gate de despacho.
- **Fallo reembolsos**: sub-reembolso 100× o `INVALID_DATA` (NaN) tras `payment-module.js:513-519` + `utils.ts:42,59`.
- **Fallo de capture desde webhook**: `capturePaymentWorkflow` usa `input.data.amount` de Culqi (céntimos) sobre importe en unidades mayores: `You cannot capture more than...` (`payment-module.js:386-399`, reintentos ×3) → nunca finaliza order desde ese path.
- **Fallo scripts de test en Windows**: `test:unit`/`test:integration:*` con sintaxis POSIX fallan en `cmd` (verificado por el verificador).

## 6. Admin

| Área | Estado | Detalle |
| --- | --- | --- |
| Login del gerente | NOT_VERIFIED en prod (página responde 200; no se probó credencial) | solo lectura |
| Roles y permisos | PARTIAL — RBAC UI-only | `middlewares.ts:237-239` — comentario explícito "authorisation is NOT handled here" |
| Gestión productos | PASS (routes) / PROD NOT_VERIFIED | CRUD custom en admin |
| Inventario | NOT_VERIFIED | estructura presente |
| Categorías (species) | PASS estructura / sin enforcement role | `api/admin/pet-product-species` |
| Variantes | NOT_VERIFIED en prod | dato real inaccesible sin credenciales |
| Subida fotografías | PASS estructural (branding/artwork multipart + MAX_ARTWORK_BYTES) | prueba real no ejecutada |
| Pedidos | PASS | órdenes UI + overview |
| Pagos | PARTIAL (verificación manual PASS; automática rota por P0-A) | _ |
| Verificación manual | PASS | flujo + audit trail |
| Despachos | PARTIAL (gate presente pero P0-B roto) | _ |
| Reembolsos | **FAIL** | `refundPayment` afectado por P0-A |
| Clientes | PASS estructura | UI Medusa core |

## 7. Storefront

| Área | Estado | Evidencia |
| --- | --- | --- |
| Inicio | PASS render / sin tarjetas en prod (verificado) | probe HTTP `/pe`: 0 enlaces `/pe/products/` |
| Categorías/productos | PARTIAL — contador ≠ tarjetas (P1-C) | `catalogue-results.tsx:91-109,149-156`; `search.ts:293`; `products.ts:151-161` |
| Buscador y filtros | PASS estructura | `/store/search` con allowed_indexes |
| Carrito | PASS estructura | _ |
| Checkout | PARTIAL — no activado hacia Culqi por P0-A; sin opciones de envío activas | `FANCYPERU_RESUMEN_DATOS_PENDIENTES.md:117` |
| Login y registro | PASS estructura | Medusa auth core + validators custom |
| Cuenta cliente | PASS estructura | `account/@dashboard/**` |
| Historial pedidos | PASS | store route con owner filter |
| Responsive | NOT_VERIFIED con navegador real en prod | solo medidas de código |
| Imágenes | PARTIAL | imágenes de productos no revisadas en prod |
| Errores JS | PARTIAL — hidratación conocida en `<header>` (`README:129-131`), separada del catálogo | no reproducible en 36 cargas |
| Enlaces | PARTIAL — footer legal/contact/shipping como `null` intencional | `FANCYPERU_RESUMEN_DATOS_PENDIENTES.md:109-116` |
| Accesibilidad | NOT_VERIFIED formal | aria labels en checkout razonables por revisión de código |
| SEO | PARTIAL — sitemap/robots implementados (`sitemap.ts`, `robots.ts`) | deploy dominio pendiente |
| Textos/datos demo | PARTIAL — textos demo mezclados con catálogo del starter | _ |

## 8. Culqi y pagos

### 8.1 Conversión monetaria (P0-A — el más grave)

**Veredicto: FAIL — cobro ~100× MENOR y estado de order contradictorio con lo cobrado.**

Cadena verificada contra `@medusajs/* @2.21.2` instalado:

1. `node_modules/.pnpm/@medusajs+utils@2.21.2.../dist/dal/mikro-orm/big-number-field.js:70-73` — persiste `bigNumber.numeric` sin escalado.
2. `.../utils/dist/totals/cart/index.js` (~:107) — total = subtotal + impuestos − descuentos (mismo orden de magnitud que el precio de input).
3. `.../core-flows@2.21.2.../dist/cart/workflows/create-payment-collection-for-cart.js:88-93` — `amount: cart.raw_total` en unidades mayores.
4. `.../payment@2.21.2.../dist/services/payment-module.js:158` — pasa `input.amount` **directamente** al provider.
5. **Provider oficial de Stripe**: `.../payment-stripe/dist/utils/get-smallest-unit.js:16-38,77-90` — multiplica `Math.pow(10, power)` antes de llamar la API externa; `stripe-base.js:143,211` para refunds.
6. Nuestro provider: `apps/backend/src/modules/culqi-payment/utils.ts:34-68` — `Math.round(rawNum)` **sin multiplicar por 100** (línea 59); el comentario de líneas 28-30 asume falsamente que Medusa ya entrega céntimos.
7. `initiatePayment` → `service.ts:75,92` envía ese entero a `data.amount`; `authorizePayment` (`service.ts:108,163-164`) lo usa para `createCharge` → **cobro mal escalado**.
8. `refundPayment` (`service.ts:262,269-271`) — `toCulqiCentimos(input.amount)` con `raw_amount` en JSONB (`big-number-field.js:17-23`) → `NaN` (INVALID_DATA) o sub-reembolso 1/100.
9. El webhook core `process-payment.js` con `capturePaymentWorkflow({amount: input.data.amount})` usa el entero de Culqi (céntimos) contra lo autorizado en Medusa en unidades mayores → el guard `payment-module.js:386-399` lanza `You cannot capture more than...` y el capture falla (reintentos ×3).

**Simulaciones (cart de 2×S/79.90, IGV 18%, envío S/10):**

| Escenario | Total Medusa (mayor) | Amount que llega al provider | `toCulqiCentimos` | Entero a Culqi | Interpretación errónea por Culqi | Real esperado |
| --- | --- | --- | --- | --- | --- | --- |
| S/ 1.00 | 1 | 1 | `Math.round(1)` | **1** | S/ 0.01 | S/ 1.00 |
| S/ 10.00 | 10 | 10 | `Math.round(10)` | **10** | S/ 0.10 | S/ 10.00 |
| S/ 79.90 | 79.9 | 79.9 | `Math.round(79.9)` | **80** | S/ 0.80 | S/ 79.90 |
| S/ 100.50 | 100.5 | 100.5 | `Math.round(100.5)` | **101** | S/ 1.01 | S/ 100.50 |
| 2×79.90 + IGV + envío | 169.96 | 169.96 | `Math.round(169.96)` | **170** | S/ 1.70 | S/ 169.96 |

- Dirección del riesgo: sub-cobro ~100×; la order queda en Medusa con el monto real pero Culqi captura 1/100 → gap financiero solo visible al conciliar.
- **Frontend**: `culqi-payment-button.tsx:99,112` reproduce el mismo error para mostrar el importe (la modal de Culqi mostraría S/0.94 con total S/94.28).
- **Documentación contradictoria**: `docs/CULQI_INTEGRACION_FANCYPERU.md:69` afirma que Medusa ya entrega céntimos; el unit test `culqi-provider.unit.spec.ts:34-36` codifica esa premisa falsa — 24/24 tests verdes no detectan el bug porque alimentan importes ya escalados a mano.
- Recomendación: además del fix de conversión, en `refundPayment` manejar `raw_amount` como `BigNumberRawValue` `{value, precision}` y no reconvertir amounts que ya vienen de Culqi en el webhook custom (ese caso ya es correcto: `webhook/route.ts:74` reusa el amount en céntimos).

### 8.2 Estado por área

| Ítem | Estado | Referencia |
| --- | --- | --- |
| Payment Provider Medusa | PASS estructura / FAIL unidades monetarias | `culqi-payment/` |
| Checkout Custom frente a Checkout V4 | PASS (SDK v4 oficial en iframe — PCI scope mínimo) | `culqi-payment-button.tsx:73-81` |
| Tokenización | PASS (backend recibe token, no PAN) | `service.ts:134` |
| 3DS | NOT_VERIFIED | `types.ts:58` campo `current_phase` sin uso en lógica |
| Webhooks | PARTIAL | secret opcional + sin match de amount |
| Captura | PARTIAL | `captureCharge` funciona pero capture-from-webhook bloqueado (§8.1.9) |
| Reembolsos | **FAIL** | §8.1.8 |
| Idempotencia | PASS (session dedupe + `payment-module.js:233-235` gating) | `service.ts:110-132` |
| Concurrencia | PARTIAL (webhook idempotente; charge retry race posible) | _ |
| Estados financieros | PARTIAL (autoCapture main-path OK pero cobra 1/100) | `manifest.json` |
| Finalización de pedidos | PARTIAL (depende de completeCartWorkflow + webhook) | _ |
| Pagos fallidos | PARTIAL — subscriber ignora FAILED (`payment-webhook.js:25`) | session queda PENDING sin cleanup |
| Seguridad de claves | PASS condicional (sk solo server en `client.ts:29-33`; frontend solo publishable `culqi-payment-button.tsx:62`) | _ |

## 9. Backend y seguridad

### 9.1 P0-B — Gate de despacho

`apps/backend/src/api/middlewares.ts:42-50` (verificado por el padre):

```ts
const isCashOnDelivery =
  meta.is_cash_on_delivery === true || meta.payment_method === 'contraentrega'
const isCaptured = collectionStatus === COMPLETED || ... PARTIALLY_CAPTURED ||
  meta.manual_payment_status === 'verified_and_captured'
if (!isCaptured && !isCashOnDelivery) throw ...
```

- La parte server-side (collectionStatus + manual_verification) es correcta y se protege bien.
- **Los flags COD los controla el cliente**: validadores Medusa 2.21.2 `dist/api/store/carts/validators.js:11,23` aceptan `metadata: record(string, unknown)` en `POST /store/carts` y `/store/carts/:id`; `complete-cart.js:454` copia `cart.metadata` verbatim a la order.
- **Exploit conceptual (no ejecutado)**: comprador con publishable key pública → `POST /store/carts { "metadata": { "is_cash_on_delivery": true } }` → checkout con `pp_system_default` → pedido impago que el admin puede despachar al pasar el gate.
- **No existe punto de escritura admin para estos flags** (grep: solo el gate y su test) → flag 100% client-controlled.
- Recomendación: reemplazar flags por una decisión server-side (columna o workflow admin) con actor+timestamp; tratar metadata solo como auditoría.

### 9.2 Otros hallazgos de seguridad

| ID | Severidad | Hallazgo | Estado |
| --- | --- | --- | --- |
| S1 | P1 | Secreto del token con fallback hardcoded: `order-token.ts:7-14` (y storefront idem) `|| "fallback_secure_fancyperu_order_token_salt_2026"` — token HMAC forgeable si la env no está configurada | FAIL |
| S2 | P1 | Storefront SSR emite token PoP para cualquier order id conocido (`order-payment/index.tsx:35-37`) y el API core deja `GET /store/orders/:id` público por diseño → oráculo de identidad/ingreso al POST manual-payment | PARTIAL |
| S3 | P1 | `authorizePayment:108` — el importe del charge depende de `data.amount` de la session (client-writable vía `StoreCreatePaymentSession`); debe derivarse server-side | PARTIAL |
| S4 | P2 (→P1 con claves válidas) | Webhook Culqi con secret opcional (`webhook/route.ts:23-35`) → POST sin auth dispara server→Culqi calls | PARTIAL |
| S5 | P2 | Sin rate-limiting (grep cero) ni cabeceras de seguridad; cookies `secure` dependen de env | PARTIAL |
| S6 | P1 | Idempotencia usa `data.charge_id` pre-cobro; reuso cross-cart de un charge de otro pedido re-apunta "pagado" a charge ajeno (sin comparar amount/cart) | PARTIAL |
| S7 | P2 | Validación del webhook NO cruza amount contra la order (contradice `CULQI_SEGURIDAD_Y_WEBHOOKS.md`) | FAIL (doc vs code) |
| S8 | INFO | Estado TLS/IDS/redes del host productivo | NOT_VERIFIED (sin acceso remoto autorizado) |

### 9.3 Rutas custom

- **Públicas store**: `GET /store/branding`, `/store/custom`, `/store/search`, `/store/products` read-only (PASS). `POST /store/orders/:id/manual-payment` con PoP HMAC + owner-filter (PASS con caveat S1/S2). `POST /store/culqi/webhook` público con secret opcional (S4).
- **Admin custom**: todas con `authenticate('user')`; sin enforcement de role (ver §9.2 S5/S6). Rutas: brands, pet-product-species, products/brand, products/pet-product-profile, branding/artwork, orders/verify-manual-payment, orders fulfillments.

## 10. Catálogo e inventario

- **P1-C cadena contador vs tarjetas**: el contador viene del índice (`search.ts:293` `nbHits`), las tarjetas de la re-hidratación de la Store API (`products.ts:151-161`). Cualquier des-sincronización del índice explica "4 vs 0".
- Los 4 productos remanentes son **del starter** (`FANCYPERU_RESUMEN_DATOS_PENDIENTES.md:107`) — acción recomendada pendiente.
- Producción hojeada hoy: home sin ningún anchor de producto (0 matches `\/pe\/products\/` en 114 kB HTML) → confirma el síntoma reportado por Codex: contador positivo con 0 tarjetas cuando el índice queda desincronizado.
- Catálogo semilla demo coherente: PEN, PUBLISHED, canal 1, taxonomía y price list real (`bootstrap-vet-catalog.ts:333-440`), pero **tax region IGV/SUNAT no existe** (`bootstrap-peru.ts:19-20` TODO) y el stock location queda sin binding (`:20-21` TODO).
- Reindex manual: TODOs conocidos (`search/product.ts:192-196`) — cambios de link/price/canal no reindexan automáticamente.
- **Datos reales del cliente no cargados** (bloqueante comercial de la nota B).

## 11. Infraestructura

- `docker-compose.production.yml` — producción hoy: PG16/Redis7/MinIO/backend/storefront en red `fancyperu-prod-net`, puertos bindeados a `192.168.1.36` (backend 9095, storefront 8099, MinIO console solo 127.0.0.1:9002), healthchecks en todos, Redis AOF + requirepass + noeviction, CORS http. **Sin TLS, sin backups, sin rotación de logs, sin rate-limiting.**
- `docker-compose.coolify.yml` — espejo con Traefik/LE y dominios `tienda/api/s3.fancyperu.com` + bloques `build:` (plan pendiente de reconciliar con la producción real).
- `docker-compose.staging.yml` — no expuesto públicamente.
- Scripts `scratch/`: instalación de backups en host (pg_dump + tar MinIO, scheduling NOT_VERIFIED), reconcile Coolify vía tinker, deploy docker save/load. **Riesgo registrado**: `scratch/clean-europe.mjs:5-9` ejecuta SQL DELETE directo sobre la DB de producción (sin evidencia de ejecución previa — NOT_VERIFIED, fuera de esta auditoría).
- Docker: `node:22-bookworm-slim`, corepack pnpm 10.11.1, build monorepo con frozen lockfile, non-root, healthchecks, `.dockerignore` limpio. `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` se hornea en build time (`storefront/Dockerfile:37-40`) — el compose de producción no define build-args (riesgo INFERIDO de `pk_placeholder`).
- Programación de backups: no definida en compose; el doc ROLLBACK promete _"daily automated off-site snapshot"_ pero el mismo doc reconoce que no está automatizado.
- **NOT_VERIFIED: esta auditoría no ejecutó ssh/docker remotos ni consultas sobre DB remota.** El estado real de DB/Redis/MinIO, inventario y datos de producción no es auditable sin credenciales.

## 12. Pruebas ejecutadas (con comandos reales)

| # | Comando | Resultado observado |
| --- | --- | --- |
| 1 | `node -p "require('./package.json').packageManager ?? 'unset'"` | `pnpm@10.11.1` |
| 2 | `pnpm --version` / `node -v` | 10.11.1 / v22.23.2 (engines ≥22 ✓) |
| 3 | `pnpm exec tsc --noEmit -p tsconfig.json` (backend) | exit 0, 0 errores |
| 4 | `pnpm exec tsc --noEmit -p tsconfig.json` (storefront) | exit 0, 0 errores |
| 5 | `pnpm run lint` (backend) | 0 errores / 3 warnings `no-service-mutations-in-api-route` |
| 6 | `pnpm run lint` (storefront) | limpio |
| 7 | `pnpm run test:unit` | **FAIL en Windows** por sintaxis POSIX (`TEST_TYPE=unit ...`); ejecutado equivalente: `pnpm exec jest --runInBand` → 7 suites / 68 tests passed |
| 8 | `pnpm run test:integration:modules` (equiv.) | 2 suites / 24 tests passed (Culqi provider + webhook unit.spec) |
| 9 | `pnpm run build` (storefront) | exit 0; 15 rutas producto SSG; shared JS 103 kB |
| 10 | Build backend | NOT_RUN por diseño (evita tocar `.medusa/` del runtime) |
| 11 | `git status -s \| wc -l` al final | 106 entradas dirty pre-existentes; **0 archivos tocados por esta auditoría** |
| 12 | HTTP GET `http://192.168.1.36:9095/health` | 200 "OK" |
| 13 | HTTP GET `http://192.168.1.36:8099/pe` | 200 / 114 kB / **0 enlaces `/pe/products/`** |
| 14 | HTTP GET `http://192.168.1.36:9095/app/login` | 200 (4.5 kB) |

Tests NO ejecutados por restricción de la auditoría (read-only): login real admin en prod, transacciones reales Culqi (BLOCKED — claves no entregadas), flujos de reembolsos reales (FAIL por código), stress/perf/probe DB remota, e2e checkout real — **NOT_VERIFIED**.

---

## 13. Problemas P0, P1 y P2

| ID | Severidad | Archivo:línea | Evidencia (corto) | Consecuencia | Recomendación | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| P0-A | P0 | `culqi-payment/utils.ts:59`; `service.ts:75,92,108,163-164,262,269-271,340,404-424` | `Math.round(rawNum)` sin ×100, contra `get-smallest-unit.js:16-90` del provider de Stripe | Cobro ~1/100 del total real en cada cargo; mismatch entre order y cobro | Multiplicar por `10^decimal_digits` (getSmallestUnit-style) en create/update/refund; **no** reconversión en webhook; reescribir `culqi-provider.unit.spec.ts:34-36` y `docs/CULQI_INTEGRACION_FANCYPERU.md:69` | **FAIL** |
| P0-B | P0 | `api/middlewares.ts:42-50` + validadores core + `complete-cart.js:454` | gate lee `order.metadata.is_cash_on_delivery` client-writable | Pedidos impago despachables | Mover el control a server-side (columna/workflow admin); tratar metadata solo como auditoría | **FAIL** |
| P1-S1 | P1 | `order-token.ts:7-14` (y storefront) | fallback hardcoded salt | token PoP forgeable si secrets unset | exigir secreto real y abortar arranque sin él | **FAIL** |
| P1-S2 | P1 | `order-payment/index.tsx:35-37` + core `GET /store/orders/:id` | SSR emite token para cualquier order id | oráculo de identidad / intento de POST manual-payment | requerir ventana de página autenticada / auth extra | PARTIAL |
| P1-S3 | P1 | `service.ts:108` | amount derivado de session `data` | un update-session malicioso haría el amount client-controlled | derivar de payment collection server-side | PARTIAL |
| P1-S4 | P2 (→P1 con claves válidas) | `webhook/route.ts:23-35,72-74` | secret opcional, **sin** amount-vs-order check | webhook sin autenticación eficaz | obligar secret; verificar `amount === collection.amount` en unidad unificada | PARTIAL |
| P1-C | P1 | `catalogue-results.tsx:91-109`; `search.ts:293`; `products.ts:151-161`; `search/product.ts:192-238` | contador = índice, tarjetas = Store API | pantalla contradictoria si el índice queda desactualizado | reindex automático tras updates de canal/price/link; alinear canal/status con la query | PARTIAL |
| P2-S5 | P2 | `medusa-config.ts` / compose | sin rate-limiting, sin `secure cookies` forzadas | DoS costoso / cookies sobre HTTP en prod | reverse-proxy limits + `COOKIE_SECURE=true` | PARTIAL |
| P2-RBAC | P2 | `seed-staff-accounts.ts:9-22`; `middlewares.ts:237-239` | roles solo UI | cualquier staff puede capture/verify | enforcement de backend por feature flags | FAIL (enforcement) |
| P2-Reemb | P1 | `service.ts:262-271` | refund con raw_amount JSONB → `NaN`/1/100 | reembolsos rotos | manejar BigNumberRawValue + conversión correcta | **FAIL** |
| P2-Win | P2 | `package.json scripts.test:*` sintaxis POSIX | `ELIFECYCLE 1` en Windows | fricción de QA | `cross-env` o shell-emulator en `.npmrc` | FAIL (script declarado) |
| P2-doc | P2 | `TESTING.md:14`, `ROLLBACK:14` | "no test runner" / "daily automated" vs repo | desinformación operacional | actualizar docs | FAIL (doc) |

## 14. Plan de corrección (ordenado, sin modificar código en esta auditoría)

1. **P0-A fix (días 1-2)**: conversión monetaria alineada con `getSmallestUnit` — multiplicar por `10^decimals` en initiate/authorize/update/refund; manejar `raw_amount` JSONB; no reconversión de amounts ya en céntimos del webhook; reescribir unit test con premisa `7990` y docs CULQI. Agregar tests para S/1.00 / 10.00 / 79.90 / 100.50.
2. **P0-B fix (días 2-3)**: flag COD server-side (columna o workflow admin-only); override/strip de metadata en el completeCart step; testing de intentos de bypass.
3. **P1-S1..S4 (días 3-4)**: forzar `ORDER_TOKEN_SECRET` no-default con abort de arranque; derivar el amount del provider desde el input del server; exigir secret del webhook + check de monto; revisar reglas de idempotencia cross-charge.
4. **P1-C reindex (días 4-5)**: correr el reindex flow; sincronizar contador == tarjetas en `/pe` en vivo.
5. **RBAC backend (días 5-6)**: enforcement por rol en las rutas admin; staff no puede capture/verify. Test de matriz de accesos.
6. **Backlog P2 (días 6-7)**: rate limiting, secure cookies, limpieza de scratch, **commitear todo el trabajo (106 entradas dirty)** y corregir docs (TESTING.md, ROLLBACK); automatizar backups.
7. **Activación Culqi (fase cliente)**: introducir keys; probar checkout sandbox→prod; webhooks con reintentos; suite de smoke con importes y reembolsos.

## 15. Bloqueantes del cliente

1. **Claves Culqi API** (públicas y privadas) — entrega/activación oficial. El SDK está montado; sin keys no se puede cobrar.
2. **Decisión de HTTPS/dominio** (Coolify con LE vs hoy HTTP LAN) — el plan Coolify ya lo prevé con certificados, pero el compose actual no lo refleja.
3. **Confirmación de catálogo real** — importar datos comerciales del cliente (`FANCYPERU_Plantilla` / `docs/PLANTILLA_CATALOGO_CLIENTE.csv`); hoy hay datos demo/seed.
4. **Opciones de envío reales** — sin opciones de envío activas documentadas (`FANCYPERU_RESUMEN_DATOS_PENDIENTES.md:117`).
5. **Validación de datos comerciales** (contacto, teléfonos, correos) pendiente según `docs/REQUERIMIENTOS_CLIENTE_FANCYPETS.md`.

## 16. Veredicto final

**A. AVANCE TÉCNICO DEL SOFTWARE: 62/100** — estructura profesional sostenible; la conversión monetaria de la integración se cae y el gate de despacho depende de datos del cliente. Recuperable una vez arreglados P0-A/P0-B.

**B. PREPARACIÓN PARA VENTAS PÚBLICAS: 20/100** — no apto para vender en línea: claves ausentes, HTTP-only en LAN, catálogo demo, checkout bloqueado por P0. La operativa (Redis, healthchecks, Docker) permite encender el resto rápido tras los ajustes.

**C. PREPARACIÓN PARA ENTREGA AL CLIENTE: 45/100** — manuales operativos y soporte documentado presentes; el commit, la limpieza de la guía operativa y las claves del cliente son prerrequisitos de entregable. **No es apto para entrega formal todavía.**

Auditoría cerrada por OpenCode en modo estrictamente read-only. El código permanece intacto; los dos archivos de informe son los únicos artefactos creados.
