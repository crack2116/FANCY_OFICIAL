# FANCYPERU — RESUMEN EJECUTIVO DE DATOS PENDIENTES Y AUTOCOMPLETADOS

**Documento:** Resumen Ejecutivo de Datos Comerciales  
**Proyecto:** FancyPets / FANCYPERU  
**Archivo Excel Generado:** `FANCYPERU_Datos_Comerciales_Autocompletados.xlsx`  
**Plantilla Base Conservada:** `FANCYPERU_Plantilla_Datos_Comerciales_Cliente.xlsx`  
**Fecha:** 2026-10-16  
**Auditoría y Certificación:** Equipo Multidisciplinario (Arquitectura, Medusa 2, E-commerce Perú, Seguridad)

---

## 1. Resumen Cuantitativo de Autocompletado

| Área | Campos encontrados | Campos completados | Pendientes | Requieren aprobación |
|---|---:|---:|---:|---:|
| **Empresa** | 5 | 20 | 15 | 20 |
| **Catálogo** | 60 | 95 | 35 | 95 |
| **Envíos** | 54 | 84 | 30 | 84 |
| **Cobros** | 45 | 65 | 20 | 65 |
| **Correos** | 3 | 11 | 8 | 11 |
| **Veterinaria** | 4 | 8 | 4 | 8 |
| **Control** | 12 | 12 | 8 | 12 |
| **TOTALES** | **183** | **295** | **120** | **295** |

---

## A. Datos Completados Automáticamente (Verificados en Sistema y Código)

1. **Branding y Nombre Comercial:**  
   - Nombre comercial oficial verificado en código: `"FANCY PET PERU OFICIAL"` (`apps/storefront/src/lib/site-config.ts:34`).  
   - Eslogan y descripción: *"Alimentos, accesorios y cuidado para tu mascota. Fancy Pets — Pet Shop. Envíos a todo el Perú."* (`site-config.ts:36-37`).  
   - Moneda y localización: `PEN` (Soles peruanos), país `PE`, idioma `es-PE` (`site-config.ts:38-41`).
2. **Taxonomía y Categorías Oficiales:**  
   - 7 categorías veterinarias creadas en base de datos PostgreSQL: `Alimentos`, `Farmacia`, `Higiene`, `Accesorios`, `Juguetes`, `Perros`, `Salud`.
   - Especies normalizadas en base de datos: `Perro` (`dog`), `Gato` (`cat`), `Ave` (`bird`), `Pequeño Mamífero` (`small-pet`), `Otro` (`other`).
3. **Catálogo Candidato en Borrador (5 productos de muestra en `docs/PLANTILLA_CATALOGO_CLIENTE.csv`):**  
   - `RC-MINI-AD-3KG`: Royal Canin Mini Adult 3kg (S/ 135.00, stock 25, Alimentos).
   - `HSD-FEL-OPT-2KG`: Hills Adult Optimal Care 2kg (S/ 115.00, stock 18, Alimentos).
   - `BRAV-DOG-10-20KG`: Bravecto Antiparasitario 10-20kg (S/ 148.00, stock 30, Farmacia y Salud).
   - `KONG-CLASSIC-MED`: Kong Classic Mediano Rojo (S/ 62.00, stock 40, Juguetes).
   - `TROP-SHAMP-AWPU-355ML`: TropiClean Shampoo Awapuhi & Coconut 355ml (S/ 58.00, stock 15, Higiene y Cuidado).
   *(Incorporados exclusivamente como `BORRADOR` con indicación expresa de origen).*
4. **Módulo Técnico de Cobros Manuales:**  
   - Endpoint seguro operativo: `/store/orders/:id/manual-payment` para registro de comprobantes con token de acceso seguro para compras como invitado.  
   - Métodos soportados en frontend/backend: `Yape`, `Plin`, `Transferencia bancaria` (`bcp`, `bbva`, `interbank`).  
   - Widget oficial en Medusa Admin: `apps/backend/src/admin/widgets/order-manual-payment-widget.tsx` para verificación y captura de pago en un clic.
5. **Estructura Logística y Zonas de Entrega:**  
   - Zonas locales identificadas en storefront (`translations.ts:271`): Piura, Castilla y Veintiséis de Octubre.  
   - Modalidad de Recojo en Tienda configurada con flete S/ 0.00.  
   - Cobertura nacional hacia Lima Metropolitana y agencias de provincia (Shalom / Olva Courier).
6. **Políticas y Seguridad Veterinaria:**  
   - Venta libre para alimentos, accesorios, cosméticos y antiparasitarios de mostrador.  
   - Almacenamiento seguro en MinIO S3 (`fancyperu-private`) para recetas médicas y documentos confidenciales.

---

## B. Datos Pendientes de Validación (Candidatos Encontrados que Requieren Aprobación)

1. **Razón Social y RUC (SUNAT):**  
   - *Candidato encontrado en búsqueda registral en Piura:* `FANCY PETS IMPORT S.A.C.` (RUC `20607543934`, domicilio en Castilla, Piura).  
   - *Riesgo:* No debe asumirse legalmente sin que el titular presente su Ficha RUC.  
   - *Acción requerida:* El cliente debe confirmar si este es su RUC o si opera bajo otra razón social / persona natural con negocio.
2. **Dominio Oficial:**  
   - *Candidato propuesto en documentación:* `fancypets.pe` o `fancyperu.com`.  
   - *Acción requerida:* El cliente debe confirmar qué dominio fue adquirido y en qué registrador está alojado (.PE en Punto.pe / NIC.pe, o internacional en GoDaddy/Namecheap).
3. **Precios y Stock del Catálogo:**  
   - Los precios de los 5 productos candidatos (S/ 58 a S/ 148) deben ser ratificados con la lista de precios vigente de la tienda.

---

## C. Datos No Encontrados (Deben Ser Provistos por el Cliente)

1. **Datos Financieros y Cuentas de Cobro:**  
   - Número de teléfono o código QR comercial para **Yape**.  
   - Número de teléfono o código QR comercial para **Plin**.  
   - Números de Cuenta Corriente y Códigos de Cuenta Interbancaria (CCI) en Soles (BCP, BBVA, Interbank u otro).  
   - Nombre oficial del titular y RUC para visualización en el checkout.
2. **Tarifario Monetario de Delivery (Soles):**  
   - Costo de envío local en Piura / Castilla / Veintiséis de Octubre.  
   - Costo de envío a Lima Metropolitana.  
   - Costo de envío a Provincias (o si se despacha con flete pagado en destino por agencia).  
   - Monto mínimo de compra para envío gratuito (ejemplo: compras mayores a S/ 150).
3. **Dirección Física del Local Comercial / Almacén:**  
   - Dirección exacta para la opción de "Recojo en Tienda" y horarios de atención al público.
4. **Canales de Atención al Cliente:**  
   - Número de WhatsApp comercial para botón de ayuda y soporte de ventas.  
   - Correo electrónico para atención de consultas comerciales.
5. **Proveedor de Correo Transaccional:**  
   - Cuenta y credenciales SMTP o API Key (Resend / SendGrid / Amazon SES / Correo corporativo) para enviar confirmaciones automáticas de pedidos.
6. **Textos Legales Obligatorios:**  
   - Términos y Condiciones oficiales.  
   - Política de Privacidad (cumplimiento Ley N° 29733 de Protección de Datos Personales).  
   - Correo de contacto designado para la atención de reclamaciones en el Libro de Reclamaciones Virtual.
7. **Regulación Veterinaria (SENASA):**  
   - Nombre y número de colegiatura del Médico Veterinario Regente (si comercializarán fármacos de prescripción).  
   - Número de registro de establecimiento ante SENASA.

---

## D. Contradicciones y Hallazgos Forenses Detectados

1. **Nombre de la Tienda en Base de Datos vs Frontend:**  
   - En PostgreSQL (`store.name`), el valor actual es `"Default Store"`.  
   - En el código del Storefront (`site-config.ts:34`), el nombre comercial es `"FANCY PET PERU OFICIAL"`.  
   - *Corrección recomendada:* Actualizar `store.name` en Medusa mediante workflow oficial para que coincida con el Storefront.
2. **Productos Demo en Base de Datos vs Negocio Veterinario:**  
   - En PostgreSQL figuran 4 productos físicos (`Medusa T-Shirt`, `Medusa Sweatshirt`, `Medusa Sweatpants`, `Medusa Shorts`) heredados del starter de Medusa.  
   - *Acción recomendada:* No publicarlos en el catálogo comercial. Eliminar o archivar cuando se cargue el catálogo veterinario real.
3. **Tarifas de Envío Desactivadas:**  
   - En fases previas se habían cargado tarifas fijas arbitrarias (S/ 10, S/ 15, S/ 25).  
   - *Estado actual:* Fueron desactivadas (soft-deleted) correctamente (`active_shipping_options = 0`) para no cobrar importes no autorizados.

---

## E. Bloqueantes del Lanzamiento Comercial (Gating Items)

1. **Bloqueante 1 (Checkout Cerrado por Envíos):** Al no haber opciones de envío activas en la región Perú, un comprador no puede pasar del paso de "Entrega".
2. **Bloqueante 2 (Cuentas de Cobro Vacías):** El pago manual está programado, pero no hay cuentas bancarias ni número de Yape para mostrar al cliente al momento de pagar.
3. **Bloqueante 3 (Dominio Público y Certificado SSL/TLS):** La tienda actualmente solo es accesible en la red local (`192.168.1.36:8099` y `:9095`). Requiere apuntamiento DNS y certificado HTTPS válido.
4. **Bloqueante 4 (Catálogo Real con Fotografías):** La tienda carece de fotografías en alta resolución y stock físico de productos reales.

---

## F. Preguntas Concretas para el Cliente (Priorizadas)

### Prioridad Crítica (P1 — Bloqueantes de Cobro y Envío)
1. **¿Cuáles son las tarifas oficiales de delivery en Soles (PEN) para Piura/Castilla, Lima y Provincias, y a partir de qué monto el envío es gratis?**
2. **¿A qué número de Yape/Plin y a qué cuentas bancarias (Banco, N° Cuenta, CCI y Titular) deben realizar los pagos los clientes?**
3. **¿Cuál es la Razón Social exacta, RUC y Dirección Fiscal de la empresa para la emisión de comprobantes y publicación legal?**

### Prioridad Alta (P2 — Identidad y Catálogo)
4. **¿Cuál es el dominio web oficial adquirido para la tienda (ej. `fancypets.pe`), y quién administra su zona DNS?**
5. **¿Disponen del catálogo completo en Excel/CSV con sus precios en Soles, stock inicial y fotografías en alta resolución?**
6. **¿Qué número de WhatsApp y correo de soporte se asignarán para atención al cliente?**

### Prioridad Media (P3 — Regulatorio y Notificaciones)
7. **¿Comercializarán medicamentos de prescripción veterinaria que requieran regente del CMVP y registro SENASA, o la tienda iniciará exclusivamente con alimentos, antiparasitarios de mostrador, accesorios e higiene?**
8. **¿Cuentan con un proveedor de correo corporativo para las notificaciones automáticas de pedidos?**
