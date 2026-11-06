# Informe de Rediseño Administrativo Fancy Pets

## Estado Actual
- Medusa 2.21.2 + Next.js 15.5.24 monorepo
- Panel Admin existente con ruta «Marca» a remover (no borrar datos)
- Sin desplegar en producción

## Modificaciones Realizadas

### 1. Eliminar «Marca» del sidebar del Admin
**Archivo:** `apps/backend/src/admin/routes/marca/page.tsx`
- Quitado `import { defineRouteConfig } from "@medusajs/admin-sdk"`
- Quitado `export const config` (esto registraba el ítem en el sidebar)
- La página `/app/marca` sigue accesible por URL directa
- Comentario actualizado: ruta intencionalmente sin listar

**Archivo:** `apps/backend/src/admin/lib/admin-copy.ts`
- Eliminado `brandingMenuLabel: "Marca"` (quedó sin uso)

**Verificación:**
- `pnpm run lint`: 0 errores, 38 advertencias preexistentes
- `pnpm run build` (`medusa build`): éxito total
- Bundle Admin: no contiene `path: "/marca"` en menuItems
- Ruta `/marca`: aún compilada y funcional

### 2. Prototipo navegable (demostración)
**Directorio:** `apps/admin-demo` (isolado, sin tocar base ni infraestructura)
- Next.js 15.5.24 + Tailwind CSS personalizado (paleta Fancy Pets)
- Página `/dashboard` con tarjetas de resumen (pedidos, ingresos, stock, clientes)
- Sidebar con 8 opciones: Inicio, Ventas, Productos, Inventario, Clientes, Delivery, Promociones, Configuración
- Componente `BrandingEditor`: selector de colores principales/ secundarios/ botones, edición de textos del banner, gestión de imágenes/banners, vista previa en tiempo real desktop/mobile, guardar borrador, descartar, publicar
- Componente `DeliveryTracker`: listado de entregas por estado, detalle del pedido, asignación de repartidores, flujo recibido→preparación→en camino→entregado/cancelado, historial de eventos con fecha/hora/responsable, confirmación de entrega, registro de incidencias
- Logo Fancy Pets preservado (SVG inline, sin modificaciones)
- Datos ficticios (no conecta a base real, storefront ni Admin activo)

**Para probar el prototipo:**
```bash
export PATH=/home/ivan/.local/node22/bin:$PATH
cd /home/ivan/fancyperu-src/apps/admin-demo
pnpm next dev -p 3002
# Luego abrir: http://127.0.0.1:3002/dashboard
```

### 3. Restricciones Cumplidas
- ✅ No desplegado todavía
- ✅ Sin modificaciones a pedidos/clientes reales
- ✅ Sin migraciones, seeds ni comandos destructivos
- ✅ Sin tocar producción `192.168.1.36`
- ✅ Logo original de Fancy Pets sin alteraciones
- ✅ Sin activar Culqi ni configurar tarifas como reales
- ✅ Datos de prueba claramente identificados en el prototipo

### 4. Arquitectura Propuesta

| Módulo | Nativo Medusa | A Construir |
|--------|:------------:|:-----------:|
| Menú principal (8 ítems) | Rutas y estructura existentes | UI personalizada, labels en español |
| Dashboard (resumen, tarjetas) | Datos de pedidos/ventas/Stock | Cards visuales, métricas propias |
| Configuración → Diseño de mi tienda | `POST /admin/branding`, `GET /store/branding` | Editor visual draft/publish, selector de colores, edición de textos, gestión de imágenes/banners, vista previa en tiempo real, persistencia segura, revalidación de caché 60s, reflejo automático en Next.js con estrategia de actualización de caché |
| Delivery (gestión pedidos) | `fulfillment_status`, `payment_status`, workflows `mark-fulfillment-as-delivered-workflow`, `create-fulfillment-workflow` | UI de estados, historial de eventos, asignación de repartidores, página segura para cliente, integración con entidades Medusa (sin GPS ni estados de transportistas "reales" sin integración) |

### 5. Próximos Pasos (tras autorización)

1. **Construir módulo Configuración → Diseño** sobre endpoints `/admin/branding` y `/store/branding`:
   - Estado `draft`/`published` en el formulario admin
   - Revalidación de caché con `next.revalidate` (60s) en `getBranding()`
   - Reflejo automático de cambios en la tienda Next.js sin deploy
   - Acceso restringido a usuarios administradores autorizados

2. **Construir módulo Delivery**:
   - UI para flujo de estados fulfillment nativos de Medusa
   - Historial de eventos con fecha, hora y responsable
   - Confirmación de entrega y registro de incidencias
   - Página pública para que el cliente consulte el avance de su pedido
   - Usar workflows `mark-fulfillment-as-delivered-workflow` y `create-fulfillment-workflow`
   - No mostrar GPS ni estados de transportistas sin integración real

3. **Implementar menú principal** con las 8 opciones y acceso role-based

4. **Revisar prototipo** en `http://127.0.0.1:3002` y autorizar los módulos a implementar

### 5. Bitácora de Cambios

| Fecha | Cambio | Archivo | Impacto |
|-------|--------|---------|---------|
| 2026-10-30 | Quitar `defineRouteConfig` y `export const config` de ruta `marca` | `apps/backend/src/admin/routes/marca/page.tsx` | «Marca» desaparece del sidebar; página sigue en `/app/marca` |
| 2026-10-30 | Eliminar `brandingMenuLabel: "Marca"` de admin-copy | `apps/backend/src/admin/lib/admin-copy.ts` | Texto sin usar; limpieza de código |
| 2026-10-30 | Compilar y verificar lint/build | Comando `pnpm` | 0 errores; build exitoso |
| 2026-10-30 | Prototipar panel admin en `apps/admin-demo` | Nueva carpeta aislada | Demostración funcional sin tocar producción |

## Conclusión

La ruta «Marca» ha sido removida del sidebar del Admin mediante el mecanismo oficial (eliminar `export const config`), preservando la página y todo el backend. El lint y build pasan sin errores. Un prototipo navegable demuestra cómo quedarían los módulos de Configuración (editor visual) y Delivery (gestión de entregas), usando exclusivamente las capacidades existentes de Medusa 2.21.2 y Next.js 15.5.24, con datos ficticios y sin afectar producción. Se awaiting autorización para implementar los módulos propuestos.