# FANCYPERU — RESUMEN EJECUTIVO (Entregable final)

> **Continuidad de la auditoría inicialmente pedida a OpenAI Codex.**
> **Revisión final ejecutada por OpenCode** (2026-10-16 → 2026-10-17), manteniendo las
> preguntas específicas del pedido original. Auditoría de **solo lectura**: el análisis
> estático y las pruebas ejecutadas no alteraron el código, la base de datos ni el
> servidor productivo (se sondearon solo endpoints HTTP de lectura explícitamente permitidos).

---

## 1. ¿Cómo vamos realmente?

Está por encima del estándar de un fork de starter, pero su sistema monetario está ROTO:

- **Integración de pagos con la unidad equivocada** (P0-A): cada cargo cobraría ~1/100 de lo real (`utils.ts:59` hace `Math.round` sin multiplicar por 100; el proveedor oficial de Stripe, `get-smallest-unit.js:16-90`, multiplica por `10^decimals`). S/ 1.00→1 céntimo, S/ 79.90→80 céntimos, S/ 100.50→101. Un carrito de S/ 169.96 cobraría S/ 1.70.
- **Despacho condicionado a metadata del cliente** (P0-B): cualquier comprador puede poner `is_cash_on_delivery=true` en su carrito, porque Medusa 2.21.2 copia `cart.metadata` verbatim a la orden (`complete-cart.js:454`) y `middlewares.ts:42-50` usa esa flag para permitir fulfillment sin pago.
- **Reembolsos rotos**: `refundPayment` recibe `raw_amount` como objeto `{value, precision}` y `Number(...)` produce `NaN` → `INVALID_DATA`, o sub-reembolso 100×.
- **Catálogo sin tarjetas** en producción: la home `http://192.168.1.36:8099/pe` devuelve 0 anclas de producto aunque el contador diga 4 (la cadena índice de búsqueda → Store API explica el desacople).

## 2. ¿Qué funciona?

- TypeScript: 0 errores en backend y storefront.
- Lint: 0 errores en ambas apps (3 warnings `no-service-mutations-in-api-route`).
- Tests: **92 tests Jest en verde** (7 suites unitarias + 2 de módulos).
- Build de storefront exitoso con 15 páginas de producto pre-renderizadas.
- Topología de producción estable: Postgres 16, Redis 7 con AOF/persistencia, MinIO, healthchecks, red dedicada `fancyperu-prod-net`.
- Integración Culqi estructuralmente correcta en la separación PCI (iframe del SDK en el front, secret keys solo en el server).
- Módulos, rutas y workflows reales (no una simulación).
- Importador del catálogo del cliente (CSV) con test unitario.

## 3. ¿Qué está incompleto?

- **Conversión monetaria**: la premisa del doc y del unit test (`culqi-provider.unit.spec.ts:34-36`) es falsa; el bug viaja por todo `initiate → authorize → webhook-capture → refund`.
- **Despacho COD**: los flags solo los escribe el cliente; no existe punto de escritura adminsitrativa.
- **Commit del trabajo**: **106 archivos** dirty (66 modificados + 40 nuevos, incluida toda `modules/culqi-payment/`) sin protección de git.
- **Catálogo real del cliente**: quedan productos demo/starter (`FANCYPERU_RESUMEN_DATOS_PENDIENTES.md:107`).
- **Envíos activos**: sin opciones de envío configuradas (`FANCYPERU_RESUMEN_DATOS_PENDIENTES.md:117`).
- **RBAC backend**: solo existe en settings-sidebar (UI).
- **Hidratación HTML** (`README:129-131`) — issue abierto conocido.
- Sitemap/robots verificados solo en build, no en producción.

## 4. ¿Qué está mal?

- P0-A (cargos incorrectos), P0-B (fulfillment por metadata manipulable), reembolsos (P1), webhook sin match de monto vs order y con secreto opcional, secret del order-token con fallback hardcoded, RBAC solo UI, docs que contradicen el código.
- En producción: **no TLS**, secure cookies no forzadas, sin rate limiting, sin backups programados en los compose.

## 5. ¿Podemos entregar? / 6. ¿Podemos vender?

| Pregunta | Respuesta |
| --- | --- |
| ¿Podemos entregar? | **Parcial** — entregable como plataforma base (manual, compose, admin, storefront con ecommerce core), pero hay que cerrar P0-A/P0-B y gestionar claves Culqi antes de formalizar pagos. |
| ¿Podemos vender? | **NO** — claves Culqi sin entregar (BLOCKED), P0-A cobra mal, dominios de venta sin HTTPS público, catálogo demo, envíos desactivados. |

## 7. ¿Qué debemos corregir primero?

1. **P0-A conversión monetaria** (crítico, impacto directo en cobros).
2. **P0-B gate de despacho server-side** (crítico, riesgo de despachos sin pago).
3. **P1 secretos**: fallback hardcoded, secreto del webhook, amount check, session data.
4. Reindexar catálogo y limpiar productos starter.
5. Decisión de HTTPS/dominio del cliente.
6. Checkout end-to-end con pruebas de S/ 1.00 / 10.00 / 79.90 / 100.50 / IGV 18%.
7. Commit del trabajo + docs (TESTING.md, ROLLBACK, CULQI_INTEGRACION con la premisa correcta).

## 8. ¿Cuánto trabajo falta?

- **~5–7 días de ingeniería** para llegar a operativo interno (incluye corrección de P0 y protección del histórico).
- **+2–3 días** de activación de producción real tras claves Culqi y dominio HTTPS.
- **Del cliente**: claves Culqi, confirmar catálogo (CSV), opciones de envío con tarifas reales, decidir dominio/HTTPS.

### Resultados reales observados en las pruebas ejecutadas

| Chequeo | Comando | Resultado |
| --- | --- | --- |
| Typecheck backend / storefront | `pnpm exec tsc --noEmit` | 0 / 0 errores |
| Lint backend / storefront | `pnpm run lint` | 0 err, 3 warnings / limpio |
| Test unit | jest `--runInBand` | 7 suites / 68 tests PASS |
| Test integration:modules | jest | 2 suites / 24 tests PASS |
| Build storefront | `pnpm run build` | exit 0 |
| Backend test scripts en Windows | script declarado | FAIL (sintaxis POSIX) |
| Prod `:9095/health` | HTTP GET | 200 OK |
| Prod `:8099/pe` | HTTP GET | 200, 0 anclas de producto |
| Prod `:9095/app/login` | HTTP GET | 200 |
| Repo limpio por auditoría | `git status` | 106 dirty pre-existentes, 0 archivos tocados |

> Detalle completo (severidad / archivo:línea / evidencia / consecuencia / recomendación /
> estado de cada hallazgo) en `AUDITORIA_REAL_FANCYPERU_CODEX.md`.

**Notas A / B / C**: Avance técnico **62/100** · Ventas públicas **20/100** · Entrega al cliente **45/100**.
