# Fancy Pets

Tienda online y panel de administración de Fancy Pets, una tienda de mascotas en Perú. La tienda para clientes funciona con Next.js y se comunica con un backend Medusa. El equipo administra todo lo demás desde el panel de Medusa, incluido el aspecto visual de la tienda.

Este repositorio comenzó como un starter DTC de Medusa y fue adaptado al producto Fancy Pets. El starter original sigue disponible en el remoto `upstream`.

## Stack

| | |
|---|---|
| Monorepo | Turborepo + espacios de trabajo pnpm |
| Backend | Medusa v2 (2.21.2), Node 22+, PostgreSQL 15+ |
| Storefront | Next.js 15 (App Router, Turbopack) |
| Gestor de paquetes | pnpm 10.11.1 |

## Requisitos

- **Node.js >= 22.22.0**
- **pnpm 10.11.1**: usá la versión del `package.json` raíz y no introduzcas un segundo lockfile.
- **PostgreSQL 15+** en ejecución y accesible desde el `DATABASE_URL` que configures.

> En una máquina de desarrollo con WSL, tené en cuenta que PostgreSQL corre *dentro* de WSL y Windows lo alcanza a través del relay de localhost de WSL2 en `127.0.0.1:5432`. Ese relay no es confiable justo después de arrancar WSL: una comprobación del servicio de PostgreSQL desde Windows siempre no encuentra nada, lo que parece una base de datos faltante cuando en realidad es un relay frío. Si el backend muere con `ECONNREFUSED 127.0.0.1:5432`, arrancá WSL y confirmá que el puerto responde varias veces seguidas antes de tocar cualquier otra cosa.

## Instalación

```bash
pnpm install

cp apps/backend/.env.template    apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

Luego completá al menos:

| Variable | Dónde | Notas |
|---|---|---|
| `DATABASE_URL` | backend | Tu cadena de conexión a PostgreSQL |
| `JWT_SECRET`, `COOKIE_SECRET` | backend | Cualquier cadena aleatoria no trivial |
| `MEDUSA_BACKEND_URL` | backend | **Ver la advertencia de abajo** |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | storefront | Sin esta clave, todas las peticiones de la tienda devuelven 400 |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | storefront | `http://localhost:9000` para desarrollo local |

> **`MEDUSA_BACKEND_URL` es crítica.** El módulo de archivos construye cada URL de los assets subidos a partir de este valor, y esas URLs después se guardan en `store.metadata.branding`. Un valor incorrecto no falla de forma visible al subir: deja enlaces inaccesibles grabados en los datos guardados. Incluí la ruta `/static`, no solo el origen: `@medusajs/file-local` reemplaza el pathname de este valor con la clave del archivo, mientras que el framework monta las subidas en `/static`.

Luego creá el esquema de la base de datos y un usuario administrador:

```bash
cd apps/backend
pnpm exec medusa db:migrate
pnpm exec medusa user -e admin@fancyperu.com -p supersecret
```

## Ejecución

```bash
pnpm run dev              # ambas apps
pnpm run backend:dev      # http://localhost:9000, admin en /app
pnpm run storefront:dev   # http://localhost:8000/pe
```

Arrancá el backend solo después de que PostgreSQL esté realmente accesible. De lo contrario, se cierra después de unos reintentos.

## Carga de datos

No existe un `pnpm run backend:seed` funcional. La tarea `seed` existe en `turbo.json`, pero el paquete del backend no define un script `seed`, así que turbo la resuelve como `<NONEXISTENT>` y el comando no hace nada. Ejecutá los scripts directamente:

```bash
cd apps/backend
pnpm exec medusa exec ./src/scripts/bootstrap-vet-domain.ts
pnpm exec medusa exec ./src/scripts/bootstrap-vet-taxonomy.ts
pnpm exec medusa exec ./src/scripts/bootstrap-vet-catalog.ts
pnpm exec medusa exec ./src/scripts/bootstrap-peru.ts
pnpm exec medusa exec ./src/scripts/seed-demo-products.ts
pnpm exec medusa exec ./src/scripts/seed-staff-accounts.ts
```

Todos son idempotentes por diseño: ejecutar uno dos veces converge en lugar de duplicar.

`bootstrap-peru.ts` es el que importa para tener una tienda funcional: crea la región de Perú, las zonas, las opciones de envío y los precios en PEN, y deja deliberadamente intacta la región demo de Europa del upstream.

`seed-staff-accounts.ts` lee sus credenciales desde el entorno y nunca desde el repositorio:

```bash
FANCYPETS_MANAGER_EMAIL=...    FANCYPETS_MANAGER_PASSWORD=...
FANCYPETS_DEVELOPER_EMAIL=...  FANCYPETS_DEVELOPER_PASSWORD=...
```

Una contraseña es obligatoria solo para una cuenta que todavía no existe. Una cuenta existente se reconcilia: se actualiza su rol y su contraseña nunca se lee, así que volver a ejecutar nunca rota una credencial en producción.

## Qué agrega este fork sobre el starter

**Un aspecto administrado por el equipo, sin cambios de código.** `Marca`, en la navegación principal, es una sola pantalla que administra los colores, el logo, la franja de anuncios, las seis imágenes de categorías y los dos banners del hero. Todo se guarda en `store.metadata.branding` en lugar de estar en el código, y la tienda prefiere los valores guardados por encima de los fallbacks incluidos, degradando entrada por entrada para que una subida faltante nunca deje un espacio en blanco.

Las subidas pasan por el módulo de archivos de Medusa con validación de tipo de imagen y tamaño, y el workflow elimina el archivo cuando falla la escritura de metadata, así que un guardado fallido no puede dejar un archivo huérfano.

**Cuentas de personal con rol.** Las cuentas llevan `metadata.role`, y la barra lateral de configuración oculta el grupo `Desarrollador` para `manager`. Esto es **solo presentación**: `metadata.role` no es autorización, y con `MEDUSA_FF_RBAC` desactivado las rutas detrás de ese grupo siguen siendo accesibles por URL directa. Al activar RBAC se carga el módulo RBAC, y en ese momento las cuentas de administración necesitan un rol RBAC real y no solo `metadata.role`.

**Una tienda que coincide con el diseño de referencia.** El trabajo de header, hero y catálogo se midió contra la tienda en vivo en lugar de estimarse a ojo, y el carrusel del hero se reproduce automáticamente con un control de play/pausa, se pausa al pasar el mouse o al enfocar, y nunca se reproduce automáticamente con `prefers-reduced-motion`.

## Estructura del proyecto

```text
apps/
  backend/     App Medusa: personalizaciones del admin, rutas de API, módulos, workflows, scripts
  storefront/  App Next.js: home, catálogo, carrito, checkout, cuenta
odd/tasks/     Documentos de funcionalidades escritos durante el desarrollo
```

## Verificaciones

```bash
pnpm run lint
cd apps/backend    && pnpm exec medusa lint
cd apps/storefront && pnpm exec next lint
cd apps/storefront && pnpm exec tsc --noEmit -p tsconfig.json
cd apps/backend    && pnpm exec tsc --noEmit -p tsconfig.json
```

`tsc` en `apps/backend` reporta un error preexistente, `TS1470` en `src/admin/widgets/login-branding-widget.tsx:4`. Tratalo como ruido de base, no como una regresión.

Las suites de integración necesitan una PostgreSQL accesible.

### Una nota sobre los guards de foco ocultos del header

El HTML SSR del header de la tienda contiene dos `<span hidden>` de guardas de foco emitidos por `Popover` de `@headlessui/react`: uno por cada Popover, en `SideMenu` y en el botón del carrito. Desaparecen del DOM después de la hidratación, y eso es correcto: Headless UI los renderiza para el primer pintado y los elimina una vez montado. **No** son la causa del desajuste de hidratación descrito arriba.

Si alguna vez ves un desajuste de hidratación en desarrollo, sospechá primero del servidor de desarrollo antes que del código: un bundle compilado contra un estado del árbol mientras el servidor renderiza otro lo reproduce de forma confiable, y desaparece cuando el servidor de desarrollo se estabiliza.

## Problemas conocidos

- **Desajuste de hidratación en `/pe`: abierto, sin explicación.** React empareja el `<header className="w-full bg-surface">` del cliente contra el `<div className="bg-[var(--chrome-header)]">` del servidor en `modules/layout/templates/nav/index.tsx`, y regenera el header en el cliente. Sobrevive a una recarga forzada. No se pudo reproducir en 36 cargas controladas (cargas nuevas con caché desactivada, perfiles de navegador limpios, una build de producción, una actualización HMR a una página viva, red limitada y siete rutas), así que depende de algo de un navegador real que una ejecución headless no alcanza. Lo primero que hay que revisar es una extensión del navegador que mute el DOM antes de que React hidrate; lo segundo es replicar el navegador y el tamaño de ventana exactos. No lo "arregles" cambiando versiones de `@headlessui/react`: los guards de foco ocultos del header son el ciclo de vida SSR previsto por esa librería, no este bug.
- **Advertencias de calidad de `next/image`.** Las miniaturas de productos pasan `quality={50}`, que Next.js 16 exigirá declarar en `images.qualities`.
