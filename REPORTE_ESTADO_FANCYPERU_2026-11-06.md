# FANCYPERU / FANCY PETS — Reporte de estado

**Fecha:** 2026-11-06
**Alcance:** código en `/home/ivan/fancyperu-src`, staging en `192.168.1.38`, documentación del proyecto.
**Tipo:** revisión de lectura. No se desplegó, no se migró, no se modificaron datos de negocio.

---

## 1. Veredicto en una línea

**Avance de construcción: 58/100. Preparación real para lanzar y vender: 30/100.**

El software está bastante por encima de un starter y los P0 de dinero/despacho ya están corregidos. Lo que falta no es principalmente código: es despliegue completo, datos comerciales reales y configuración de cobros/envíos.

| Dimensión | Nota | Lectura |
|---|---:|---|
| Software / técnico | **78/100** | P0 de pagos y despacho corregidos; 164 tests en verde; TypeScript limpio |
| Infraestructura / operación | **42/100** | Backend y admin arriba en staging; storefront caído; HTTP sin TLS; sin backups ni monitoreo |
| Datos y catálogo | **25/100** | 18 productos, solo 4 (los demo de Medusa) tienen precio en la región Perú |
| Pagos | **30/100** | Culqi integrado pero apagado y sin claves; Yape/Plin/transferencia sin cuentas |
| Listo para vender | **20/100** | Sin envíos activos, sin cuentas de cobro, sin dominio/TLS, catálogo demo |
| Entrega al cliente | **50/100** | Código y documentación entregables; falta Git, staging completo y datos del cliente |

> Si el 100 significa “tienda vendiendo en producción”, el proyecto está en **30/100**.
> Si el 100 significa “software construido y endurecido”, está en **78/100**.

---

## 2. Qué está funcionando hoy

### Código y calidad

- TypeScript: **0 errores** en backend y storefront (`tsc --noEmit`).
- Tests unitarios del backend: **164/164 en verde, 12 suites**.
- Lint backend: **0 errores**, 38 advertencias. La mayoría son del script de staging (`staging-financial-e2e.ts`) y de mutaciones directas de `orderService` en rutas de pago manual.
- Lint storefront: **sin errores ni advertencias** (con variables de entorno de prueba).
- Arquitectura real: 19 rutas API propias, 6 workflows, módulos `brand`, `pet-product` y proveedor de pago `culqi-payment`.
- Build de admin y storefront reportado como exitoso en los informes del 24 y 30 de octubre.

### Correcciones importantes ya presentes en el código

- **P0-A (unidad monetaria): corregido.** `toCulqiCentimos` convierte soles a céntimos multiplicando por 100 (`Math.round(major * 100)`), incluyendo objetos `{ value, precision }`.
- **P0-B (despacho por metadata del comprador): corregido.** El gate de fulfillment es server-side y fail-closed. El COD solo se acepta con firma HMAC emitida por `POST /admin/orders/:id/authorize-cod`; las claves del comprador (`is_cash_on_delivery`, etc.) se ignoran y se limpian en `middlewares.ts`.
- **Reembolsos: corregidos.** Usan la misma conversión a céntimos, verifican el cargo remoto y aplican idempotencia.
- **Webhook de Culqi: endurecido.** En producción exige `CULQI_WEBHOOK_SECRET`, hace lookup server-to-server del cargo, valida moneda y monto, y usa ledger de idempotencia.
- **Token de pedido: endurecido.** En producción lanza error si no hay `ORDER_TOKEN_SECRET` (o fallback `COOKIE_SECRET`/`JWT_SECRET`); ya no usa el salt hardcodeado.
- **RBAC:** el módulo está registrado en `medusa-config.ts`, no solo la UI.
- **Almacenamiento:** MinIO/S3 con buckets `fancyperu-media` (lectura pública) y `fancyperu-private` (privado). En producción el backend falla al arrancar si no hay S3.

### Staging

- Stack Dokploy existe y el **backend responde**: `GET /health` → 200, `/app/login` → 200.
- Región **Perú (PEN)** existe, además de la región heredada Europa (EUR).
- Store API responde con la publishable key de staging.

---

## 3. Qué está roto o bloqueado

### Bloqueantes técnicos / de despliegue

1. **El storefront está caído.** `http://shop.192.168.1.38.nip.io/pe` devuelve **404** de Traefik (no hay router/container activo). Ya estaba así el 30/10. Sin storefront no hay tienda que probar ni vender.
2. **Los cambios del 24–30/10 no están desplegados.** El último deploy de Dokploy es del **2026-10-24 21:02**. El rediseño visual, el admin en español y el prototipo de panel son locales. El informe del 30/10 lo confirma: “No se desplegó”.
3. **Sin HTTPS ni dominio real.** Todo corre en `*.192.168.1.38.nip.io` por HTTP. `COOKIE_SECURE=false`, `TRAEFIK_TLS=false`.
4. **Sin Git.** El directorio no tiene `.git`; tampoco hay CI. No hay historial, diff ni rollback. El único respaldo es `fancyperu-src.tgz` del 23/10.
5. **Sin backups automáticos.** El compose de Dokploy define volúmenes, pero la API de Dokploy devuelve `backups: []`. No hay copia programada de PostgreSQL/MinIO.
6. **Sin monitoreo, alertas ni error tracking.** No hay Sentry, Prometheus, Grafana ni analytics.
7. **El servidor “producción” anterior (192.168.1.36) está caído.** `:9095/health` no responde. Quedan los compose de Coolify como legado, pero no están operativos.
8. **Credenciales en texto plano en el home.** `fancyperu-dokploy.env`, `fancyperu-dokploy-token` y archivos asociados están en `/home/ivan`. Conviene moverlos a un gestor de secretos y rotar el token de Dokploy.

### Bloqueantes comerciales

1. **Catálogo sin precios en Perú.** De 18 productos publicados, solo los 4 demo de Medusa (`Medusa T-Shirt`, `Shorts`, `Sweatpants`, `Sweatshirt`) tienen precio calculado en la región Perú. Los 14 productos veterinarios (`Alimento Cachorro`, `Shampoo`, `Cama`, etc.) devuelven `calculated_amount: null`.
2. **Productos demo mezclados con el catálogo real.** Siguen publicados los 4 productos del starter.
3. **Envíos sin configurar.** `SHIPPING_MATRIX_JSON` está vacío y no existe `config/shipping-matrix.json`; el cargador devuelve lista vacía por diseño. Sin opciones de envío activas el checkout no puede cerrar.
4. **Cuentas de cobro vacías.** `NEXT_PUBLIC_YAPE_PHONE`, `NEXT_PUBLIC_PLIN_PHONE` y `NEXT_PUBLIC_BANK_ACCOUNTS` están vacíos en staging.
5. **Culqi apagado.** `CULQI_ENABLED=false`, `CULQI_PUBLIC_KEY`, `CULQI_SECRET_KEY` y `CULQI_WEBHOOK_SECRET` vacíos. No se puede cobrar con tarjeta.
6. **Sin correo transaccional.** No hay Resend, SES, SendGrid ni SMTP. No salen confirmaciones de pedido.
7. **Datos legales y de identidad pendientes:** RUC/razón social, dominio, dirección, WhatsApp, términos, privacidad, libro de reclamaciones, SENASA/regente.
8. **Sin fotos reales.** Las imágenes actuales son SVG/demo; las fichas usan material de demostración.
9. **`store.name` puede seguir como “Default Store”** según la documentación del 17/10; no se pudo verificar por Admin sin credenciales.

### Deuda técnica menor

- Persiste el **hydration mismatch** documentado en `README.md` (no reproducido de forma controlada).
- `apps/admin-demo` es un prototipo con datos ficticios, incluido en el workspace; conviene sacarlo del build de entrega o marcarlo claramente.
- Quedan dependencias y componentes de **Stripe** heredados del starter, aunque el proveedor activo es Culqi.
- 38 warnings de lint, incluidas 3 mutaciones directas en rutas de pago manual que deberían moverse a workflows.

---

## 4. Servicios que estamos usando

### Infraestructura (todo autohospedado)

| Capa | Servicio | Versión / instancia | Estado |
|---|---|---|---|
| Hosting | Servidor Ubuntu 26.04 en `192.168.1.38` | — | Activo |
| Panel / PaaS | **Dokploy** + **Traefik** | panel en `:3000` | Activo; stack `fancyperu-test-k6cmve` |
| Base de datos | **PostgreSQL** | 16-alpine, volumen `fancyperu_db_data` | Activo; sin backups |
| Colas / caché | **Redis** | 7-alpine, AOF, `noeviction`, 128 MB | Activo; event bus, workflow engine y cache |
| Almacenamiento | **MinIO** (S3 compatible) | `fancyperu-media`, `fancyperu-private` | Activo; bucket público de lectura + privado |
| DNS de prueba | **nip.io** | `api/shop/s3.192.168.1.38.nip.io` | Activo; solo LAN/HTTP |
| Legado | **Coolify 4.4.6** en `192.168.1.36` | compose de producción anterior | Caído/no operativo |

### Aplicaciones

| Capa | Servicio | Versión | Estado |
|---|---|---|---|
| Backend / Admin | **Medusa v2** | 2.21.2, Node 22 | Activo en staging (`/health` 200) |
| Storefront | **Next.js** | 15.5.24, App Router | Caído (404) |
| Prototipo admin | Next.js + Tailwind | 15.5.24 | Local, datos ficticios, no desplegado |
| Búsqueda | InstantSearch/Medusa adapter | — | Local, sin Algolia externo |
| Pagos tarjeta | **Culqi** | API + webhook | Integrado, **desactivado y sin claves** |
| Pagos manuales | Yape / Plin / transferencia BCP-BBVA-Interbank | — | Código listo, **datos vacíos** |
| Login social | Google OAuth | — | Opcional, no configurado |
| Correo | Ninguno | — | Pendiente (Resend/SES/SMTP) |
| Analítica / errores | Ninguno | — | Pendiente |
| CI/CD | Ninguno | — | Deploy manual desde Dokploy |
| Control de versiones | Ninguno | — | **No hay `.git`** |

### Lo que no se está usando

- No hay AWS/GCP/Azure, Vercel, Cloudflare, Supabase ni base de datos gestionada.
- No hay Algolia, Sentry, PostHog, GA4, Resend/SendGrid.
- Stripe aparece en dependencias heredadas, pero no es el proveedor activo.

---

## 5. Evidencia recogida en esta revisión

| Chequeo | Resultado |
|---|---|
| `tsc --noEmit` backend | 0 errores |
| `tsc --noEmit` storefront | 0 errores |
| `pnpm run test:unit` backend | 12 suites, 164 tests, todos PASS |
| `medusa lint` backend | 0 errores, 38 warnings |
| `next lint` storefront | 0 errores, 0 warnings |
| `GET http://api.192.168.1.38.nip.io/health` | 200 `OK` |
| `GET http://api.192.168.1.38.nip.io/app/login` | 200 |
| `GET http://shop.192.168.1.38.nip.io/pe` | **404** |
| Store API `/store/regions` | 2 regiones: Europa (EUR, 7 países), Perú (PEN, 1 país) |
| Store API `/store/products` | 18 productos; solo 4 con precio en PEN |
| Último deploy Dokploy | 2026-10-24 21:02, estado `done` |
| Backups Dokploy | `[]` |
| Repositorio Git | No existe `.git` |

No se ejecutaron pruebas de integración HTTP ni transacciones reales de Culqi: requieren base descartable y claves que no están configuradas.

---

## 6. Plan recomendado (7 a 10 días)

### Primero: recuperar la tienda y la protección del trabajo (1–2 días)

1. **Inicializar Git** y hacer commit de todo el estado actual. Sin esto no hay rollback ni auditoría de cambios.
2. **Levantar el storefront en staging** y revisar logs del contenedor. Verificar `/pe`, `/pe/store`, `/pe/cart`, `/pe/checkout`, `/favicon.ico`, `/manifest.webmanifest`.
3. **Desplegar los cambios del 24–30/10** (rediseño, admin en español, `/app/marca`) con el script `deploy/dokploy/build-images.sh` y “Redeploy” en Dokploy.
4. **Configurar backup diario** de PostgreSQL y MinIO, y probar una restauración.

### Después: cerrar el checkout (2–3 días)

5. Cargar la **matriz de envíos real** (`config/shipping-matrix.json` o `SHIPPING_MATRIX_JSON`) y verificar que el checkout llegue a “pagar”.
6. Cargar **Yape, Plin y cuentas bancarias** reales.
7. Definir si se habilita **Culqi**: si sí, cargar claves de producción, activar `CULQI_WEBHOOK_SECRET` y probar S/ 1.00, 10.00, 79.90, 100.50 e IGV 18%.
8. Configurar **correo transaccional** (Resend/SES/SMTP).

### Al final: datos y lanzamiento (3–5 días)

9. Reemplazar los 4 productos demo y cargar **precios PEN, stock y fotos reales** de los 14 productos veterinarios.
10. Cambiar `store.name`, cargar branding definitivo y textos legales.
11. Configurar **dominio real + HTTPS** (Traefik/Let’s Encrypt), `COOKIE_SECURE=true` y CORS definitivos.
12. Prueba end-to-end: catálogo → carrito → envío → pago manual → verificación admin → fulfillment.
13. Configurar monitoreo mínimo: healthchecks, alertas de caída y errores.

---

## 7. Conclusión

El proyecto ya no está en la fase “starter con bugs críticos”: los dos P0 que impedían cobrar y despachar están cerrados y hay una base de pruebas seria. El problema ahora es de **entrega y datos**: el storefront está caído, los cambios recientes no están desplegados, no hay Git ni backups, y el catálogo real no tiene precios en soles ni medios de pago/envío configurados.

**No está listo para vender.** Sí está listo para una siguiente fase de cierre técnico-comercial de aproximadamente **1.5 a 2 semanas**, siempre que el cliente entregue catálogo, precios, fotos, tarifas, cuentas de cobro, RUC/dominio y decisión sobre Culqi.
