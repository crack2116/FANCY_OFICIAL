# FANCYPERU — MATRIZ DE TRAZABILIDAD, FUENTES Y VALIDACIONES COMERCIALES

**Documento:** Registro de Auditoría y Trazabilidad de Datos Comerciales  
**Archivo Excel Asociado:** `FANCYPERU_Datos_Comerciales_Para_Validar.xlsx` (Hojas: `FUENTES_Y_VALIDACIONES` y `PREGUNTAS_PARA_NOSOTROS`)  
**Fecha de Auditoría:** 2026-10-16  
**Principio Rector:** Cero invención de datos comerciales. Distinción explícita entre lo verificado en código, documentación candidata y datos pendientes.

---

## 1. Clasificación de Niveles de Confianza

1. **VERIFICADO EN SISTEMA:** El dato existe en código fuente, archivos de configuración o tablas de la base de datos de producción.
2. **VERIFICADO EN DOCUMENTACIÓN OFICIAL:** El dato figura en los documentos de requerimientos o plantillas oficiales del proyecto.
3. **CANDIDATO POR VALIDAR:** El dato proviene de copys comerciales o fuentes públicas (ej. SUNAT, consultas web), pero requiere ratificación formal del cliente.
4. **NO DISPONIBLE:** El dato no existe en el proyecto y debe ser provisto obligatoriamente por el cliente.

---

## 2. Registro Completo de Trazabilidad (67 Puntos de Control)


### Hoja: EMPRESA

| Celda / Campo | Valor Registrado | Fuente | Ruta / Tabla / URL | Confianza | Requiere Aprobación | Observaciones |
|---|---|---|---|---|:---:|---|
| **B5 (Nombre comercial)** | FANCY PET PERU OFICIAL | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | VERIFICADO EN SISTEMA | SÍ | Nombre comercial configurado en frontend (apps/storefront/src/lib/site-config.ts:34). Requiere ratificación formal del cliente. |
| **B6 (Razón social)** | Pendiente confirmación oficial del cliente | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | NO asumir coincidencia en SUNAT (FANCY PETS IMPORT S.A.C.). La razón social legal debe ser provista y acreditada con Ficha RUC. |
| **B7 (RUC)** | Pendiente confirmación oficial del cliente | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | 11 dígitos. NO asumir RUC 20607543934 sin verificación documental formal del cliente. |
| **B8 (Departamento base)** | Pendiente confirmación oficial (Candidato: Piura) | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | CANDIDATO POR VALIDAR | SÍ | Mencionado en traducciones de beneficios (translations.ts:271), pero no constituye confirmación legal ni logística del negocio. |
| **B9 (Provincia base)** | Pendiente confirmación oficial (Candidato: Piura) | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | CANDIDATO POR VALIDAR | SÍ | Provincia base sujeta a ratificación formal del cliente. |
| **B10 (Distrito base)** | Pendiente confirmación oficial (Candidato: Piura / Castilla / 26 de Octubre) | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | CANDIDATO POR VALIDAR | SÍ | Distrito de despacho comercial exacto por confirmar por el cliente. |
| **B11 (Dirección comercial)** | Pendiente confirmación de local comercial / almacén | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Dirección física oficial para despacho y recojo en tienda no registrada en código. |
| **B12 (Correo de atención al cliente)** | Pendiente correo corporativo oficial | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Buzón oficial de atención al cliente. No utilizar gerente@fancyperu.com (cuenta administrativa Medusa). |
| **B13 (WhatsApp de ventas)** | Pendiente WhatsApp comercial (+51) | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Requiere número telefónico oficial con prefijo internacional para canal de ventas y soporte. |
| **B14 (Teléfono alternativo)** | No registrado | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Teléfono secundario o de oficina no disponible en código. |
| **B15 (Horario de atención)** | Pendiente horario oficial | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Horario comercial de despacho y atención al público por definir por el cliente. |
| **B16 (Dominio adquirido)** | Pendiente confirmación de dominio (Candidato: fancypets.pe) | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | CANDIDATO POR VALIDAR | SÍ | Mencionado como ejemplo en docs/REQUERIMIENTOS_CLIENTE_FANCYPETS.md. No asumir que está comprado o delegado. |
| **B17 (Persona responsable del dominio)** | Pendiente designar administrador DNS | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Nombre y cargo de la persona responsable del registrador de dominio (sin contraseñas). |
| **B18 (URL Libro de Reclamaciones)** | Pendiente URL legal y buzón oficial | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Enlace en footer preparado con href: null (site-config.ts:261); requiere URL legal y libro virtual oficial. |
| **B19 (URL Política de privacidad)** | Pendiente texto legal aprobado | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Enlace en footer preparado con href: null (site-config.ts:260); texto legal pendiente de asesoría jurídica. |
| **B20 (URL Términos y condiciones)** | Pendiente términos comerciales aprobados | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Enlace en footer preparado con href: null (site-config.ts:259); términos comerciales pendientes de aprobación. |
| **B21 (URL Política de cambios y devoluciones)** | Pendiente política de cambios aprobada | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Enlace en footer preparado con href: null (site-config.ts:243); política de cambios pendiente de aprobación. |
| **B22 (Responsable para aprobar catálogo)** | Pendiente designar persona responsable | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Nombre y cargo del responsable del cliente para validar catálogo, precios y fotos. |
| **B23 (Responsable para aprobar envíos)** | Pendiente designar persona responsable | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Nombre y cargo del responsable del cliente para validar cobertura y fletes. |
| **B24 (Responsable para aprobar cobros)** | Pendiente designar persona responsable | Código Fuente / Docs / Auditoría Legal | `apps/storefront & docs` | NO DISPONIBLE | SÍ | Nombre y cargo del responsable del cliente para validar cobros y cuentas. |

### Hoja: CATALOGO

| Celda / Campo | Valor Registrado | Fuente | Ruta / Tabla / URL | Confianza | Requiere Aprobación | Observaciones |
|---|---|---|---|---|:---:|---|
| **Fila 5 (SKU RC-MINI-AD-3KG)** | Royal Canin Mini Adult 3kg - S/ 135.0 | Documentación de Ejemplo | `docs/PLANTILLA_CATALOGO_CLIENTE.csv` | CANDIDATO POR VALIDAR | SÍ | EJEMPLO DE PLANTILLA (docs/PLANTILLA_CATALOGO_CLIENTE.csv). No corresponde a inventario aprobado. Requiere validación de SKU, precio, stock y fotografía oficial. |
| **Fila 6 (SKU HSD-FEL-OPT-2KG)** | Hills Adult Optimal Care 2kg - S/ 115.0 | Documentación de Ejemplo | `docs/PLANTILLA_CATALOGO_CLIENTE.csv` | CANDIDATO POR VALIDAR | SÍ | EJEMPLO DE PLANTILLA (docs/PLANTILLA_CATALOGO_CLIENTE.csv). No corresponde a inventario aprobado. Requiere validación de SKU, precio, stock y fotografía oficial. |
| **Fila 7 (SKU BRAV-DOG-10-20KG)** | Bravecto Antiparasitario 10-20kg - S/ 148.0 | Documentación de Ejemplo | `docs/PLANTILLA_CATALOGO_CLIENTE.csv` | CANDIDATO POR VALIDAR | SÍ | EJEMPLO DE PLANTILLA (docs/PLANTILLA_CATALOGO_CLIENTE.csv). Fármaco de mostrador de venta libre. Requiere aprobación comercial del cliente. |
| **Fila 8 (SKU KONG-CLASSIC-MED)** | Kong Classic Mediano Rojo - S/ 62.0 | Documentación de Ejemplo | `docs/PLANTILLA_CATALOGO_CLIENTE.csv` | CANDIDATO POR VALIDAR | SÍ | EJEMPLO DE PLANTILLA (docs/PLANTILLA_CATALOGO_CLIENTE.csv). Juguete mordillo. Requiere aprobación comercial del cliente. |
| **Fila 9 (SKU TROP-SHAMP-AWPU-355ML)** | TropiClean Shampoo Awapuhi & Coconut 355ml - S/ 58.0 | Documentación de Ejemplo | `docs/PLANTILLA_CATALOGO_CLIENTE.csv` | CANDIDATO POR VALIDAR | SÍ | EJEMPLO DE PLANTILLA (docs/PLANTILLA_CATALOGO_CLIENTE.csv). Cosmético de venta libre. Requiere aprobación comercial del cliente. |

### Hoja: ENVIOS

| Celda / Campo | Valor Registrado | Fuente | Ruta / Tabla / URL | Confianza | Requiere Aprobación | Observaciones |
|---|---|---|---|---|:---:|---|
| **Fila 5 (Piura (Distrito) - Delivery Local Estándar)** | Modalidad: Delivery Local Estándar (Courier Local / Motorizado) | Código y Documentación | `translations.ts:271 & REQUERIMIENTOS.md` | CANDIDATO POR VALIDAR | SÍ | Estructura logística tentativa extraída de translations.ts:271. Cobertura y flete monetario pendientes de aprobación formal. |
| **Fila 6 (Castilla - Delivery Local Estándar)** | Modalidad: Delivery Local Estándar (Courier Local / Motorizado) | Código y Documentación | `translations.ts:271 & REQUERIMIENTOS.md` | CANDIDATO POR VALIDAR | SÍ | Estructura logística tentativa extraída de translations.ts:271. Cobertura y flete monetario pendientes de aprobación formal. |
| **Fila 7 (Veintiséis de Octubre - Delivery Local Estándar)** | Modalidad: Delivery Local Estándar (Courier Local / Motorizado) | Código y Documentación | `translations.ts:271 & REQUERIMIENTOS.md` | CANDIDATO POR VALIDAR | SÍ | Estructura logística tentativa extraída de translations.ts:271. Cobertura y flete monetario pendientes de aprobación formal. |
| **Fila 8 (Lima Metropolitana - Envío Interprovincial / Local)** | Modalidad: Envío Interprovincial / Local (Olva Courier / Shalom) | Código y Documentación | `translations.ts:271 & REQUERIMIENTOS.md` | CANDIDATO POR VALIDAR | SÍ | Zona requerida en docs/REQUERIMIENTOS_CLIENTE_FANCYPETS.md. Tarifa y modalidad pendientes de fijación comercial. |
| **Fila 9 (Provincias (Capitales de Región) - Envío por Agencia)** | Modalidad: Envío por Agencia (Shalom / Marvisur / Olva) | Código y Documentación | `translations.ts:271 & REQUERIMIENTOS.md` | CANDIDATO POR VALIDAR | SÍ | Modalidad sugerida para flete pagado en destino por agencia. Pendiente de aprobación comercial. |
| **Fila 10 (Local Comercial - Recojo en Tienda)** | Modalidad: Recojo en Tienda (Local propio) | Código y Documentación | `translations.ts:271 & REQUERIMIENTOS.md` | CANDIDATO POR VALIDAR | SÍ | Modalidad sin costo de flete. Requiere dirección oficial del establecimiento físico. |

### Hoja: COBROS

| Celda / Campo | Valor Registrado | Fuente | Ruta / Tabla / URL | Confianza | Requiere Aprobación | Observaciones |
|---|---|---|---|---|:---:|---|
| **Fila 5 (Yape)** | Uso: SÍ \| Proveedor: BCP / Yape | Código Medusa Backend & Widget | `apps/backend/src/api/store/orders & widgets` | VERIFICADO EN SISTEMA | SÍ | Módulo técnico de registro de comprobante operativo en Medusa 2. Cuentas comerciales pendientes de entrega por el cliente. |
| **Fila 6 (Plin)** | Uso: SÍ \| Proveedor: Interbank / Scotiabank / BBVA | Código Medusa Backend & Widget | `apps/backend/src/api/store/orders & widgets` | VERIFICADO EN SISTEMA | SÍ | Soporte en endpoint /store/orders/:id/manual-payment. Número oficial pendiente de entrega por el cliente. |
| **Fila 7 (Transferencia bancaria)** | Uso: SÍ \| Proveedor: BCP / BBVA / Interbank | Código Medusa Backend & Widget | `apps/backend/src/api/store/orders & widgets` | VERIFICADO EN SISTEMA | SÍ | Flujo manual seguro implementado con token para invitados. Cuentas bancarias pendientes de entrega por el cliente. |
| **Fila 8 (Tarjetas / pasarela)** | Uso: POR DEFINIR \| Proveedor: Mercado Pago / Culqi / Niubiz (Opciones candidatas) | Código Medusa Backend & Widget | `apps/backend/src/api/store/orders & widgets` | VERIFICADO EN SISTEMA | SÍ | Ninguna pasarela de tarjetas está integrada ni contratada. Requiere contrato comercial y credenciales API de producción. |
| **Fila 9 (Pago contra entrega)** | Uso: POR DEFINIR \| Proveedor: Efectivo / POS móvil | Código Medusa Backend & Widget | `apps/backend/src/api/store/orders & widgets` | VERIFICADO EN SISTEMA | SÍ | Requiere confirmar si el courier cuenta con cobranza en destino y distritos autorizados. |

### Hoja: CORREOS

| Celda / Campo | Valor Registrado | Fuente | Ruta / Tabla / URL | Confianza | Requiere Aprobación | Observaciones |
|---|---|---|---|---|:---:|---|
| **B5 (Dominio oficial)** | Pendiente confirmación de dominio (Candidato: fancypets.pe) | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | CANDIDATO POR VALIDAR | SÍ | Mencionado en requerimientos; pendiente acreditación de compra y titularidad. |
| **B6 (Responsable DNS)** | Pendiente designar administrador DNS | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Nombre y cargo de la persona con acceso a la zona DNS corporativa. |
| **B7 (Proveedor de correo)** | Resend / SendGrid / SMTP corporativo (PROPUESTO) | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Actualmente se usa event bus local in-memory; requiere credenciales SMTP transaccionales. |
| **B8 (Correo remitente para pedidos)** | pedidos@dominio-oficial (PROPUESTO) | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Buzón oficial emisor; no crear antes de delegar el dominio oficial. |
| **B9 (Nombre remitente)** | FANCY PET PERU OFICIAL | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | VERIFICADO EN SISTEMA | SÍ | Nombre comercial extraído de apps/storefront/src/lib/site-config.ts:34. |
| **B10 (Correo de respuestas)** | atencionalcliente@dominio-oficial (PROPUESTO) | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Dirección para dudas de clientes; separar de cuenta gerente@fancyperu.com. |
| **B11 (Correo avisos internos)** | ventas@dominio-oficial (PROPUESTO) | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Buzón interno para recepción de avisos de nuevas compras y comprobantes manuales. |
| **B12 (SPF/DKIM/DMARC configurados)** | Pendiente validación técnica post-DNS | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Se verificará mediante registros TXT una vez configurado el proveedor de correo. |
| **B13 (Plantilla confirmación de pedido)** | Plantilla base Medusa configurada | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Estructura de correo lista; pendiente firma corporativa, logo oficial y datos de contacto. |
| **B14 (Plantilla estado de entrega)** | Pendiente integración de courier | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Texto y enlace de seguimiento para pedidos despachados. |
| **B15 (Política de notificaciones)** | Eventos de pedido: placed, fulfilled, canceled | Arquitectura Medusa & Docs | `apps/storefront/src/lib/site-config.ts & docs` | NO DISPONIBLE | SÍ | Notificaciones automáticas en cada cambio de estado de la orden. |

### Hoja: VETERINARIA

| Celda / Campo | Valor Registrado | Fuente | Ruta / Tabla / URL | Confianza | Requiere Aprobación | Observaciones |
|---|---|---|---|---|:---:|---|
| **B5 (¿Se venderán medicamentos veterinarios?)** | POR DEFINIR (Antiparasitarios en plantilla de ejemplo) | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | NO DISPONIBLE | SÍ | En docs/PLANTILLA_CATALOGO_CLIENTE.csv se lista Bravecto. Requiere validación de alcance comercial. |
| **B6 (Responsable veterinario/regente (si aplica))** | Pendiente designar Médico Veterinario (si aplica) | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | NO DISPONIBLE | SÍ | Obligatorio por normativa SENASA (D.S. 015-98-AG y modificatorias) si se expenden fármacos veterinarios. |
| **B7 (Registro/autorización de establecimiento (si aplica))** | Pendiente certificado de autorización SENASA (si aplica) | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | NO DISPONIBLE | SÍ | Autorización sanitaria de funcionamiento como establecimiento de expendio de productos veterinarios. |
| **B8 (Política de venta con receta (si aplica))** | Venta libre para antiparasitarios/suplementos; receta obligatoria para fármacos controlados | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | VERIFICADO EN DOCUMENTACIÓN OFICIAL | SÍ | Política estructurada en docs/REQUERIMIENTOS_CLIENTE_FANCYPETS.md sección 7. |
| **B9 (Custodia segura de recetas (si aplica))** | Bucket S3 privado (fancyperu-private) implementado técnicamente | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | VERIFICADO EN SISTEMA | SÍ | Módulo de almacenamiento seguro operativo en MinIO. Pendiente definir protocolo de retención y archivo físico/digital. |
| **B10 (Lotes y vencimientos)** | Control de trazabilidad en almacén previo al despacho | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | NO DISPONIBLE | SÍ | Se debe registrar lote y fecha de vencimiento visible en el empaque del producto entregado. |
| **B11 (Política de sustituciones y devoluciones)** | No se admiten devoluciones de medicamentos veterinarios una vez abiertos o entregados | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | NO DISPONIBLE | SÍ | Por seguridad zoosanitaria y garantía de cadena de custodia, los medicamentos no admiten devolución salvo falla de fábrica. |
| **B12 (Responsable legal/comercial de aprobación)** | Pendiente designar representante legal | Normativa SENASA & Arquitectura | `docs/REQUERIMIENTOS.md & MinIO` | NO DISPONIBLE | SÍ | Firma de aprobación de la declaración de productos veterinarios. |

### Hoja: CONTROL

| Celda / Campo | Valor Registrado | Fuente | Ruta / Tabla / URL | Confianza | Requiere Aprobación | Observaciones |
|---|---|---|---|---|:---:|---|
| **C5 (Datos legales y contacto)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Faltan RUC, Razón Social oficial y dirección fiscal para publicar en la tienda. |
| **C6 (Dominio y responsable DNS)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Requiere confirmación de dominio adquirido y acceso DNS para configurar registros A/CNAME. |
| **C7 (Catálogo real aprobado)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | 5 productos identificados corresponden a ejemplos de plantilla. Pendiente catálogo comercial real aprobado. |
| **C8 (Precios y stock aprobados)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Precios en PEN y stock deben ser validados contra inventario físico antes de habilitar venta. |
| **C9 (Marcas, fotos y descripciones)** | EN REVISIÓN | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Marcas identificadas (Royal Canin, Hills, Bravecto, Kong, TropiClean). Faltan fotos en alta resolución. |
| **C10 (Cobros autorizados)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Soporte técnico listo para Yape/Plin/Transferencia. Faltan cuentas bancarias y titular oficial. |
| **C11 (Procedimiento de verificación bancaria)** | EN REVISIÓN | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Widget administrativo oficial implementado en Medusa. Pendiente asignar persona encargada de conciliar. |
| **C12 (Cobertura y tarifario)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Tarifas arbitrarias dadas de baja en Medusa. Pendiente matriz oficial de fletes por distrito y operador. |
| **C13 (Correo transaccional)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Eventos de correo preparados. Requiere credenciales de proveedor SMTP (Resend/SendGrid) y dominio propio. |
| **C14 (Políticas legales y privacidad)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Enlaces en footer listos. Requiere textos definitivos de Términos, Privacidad y Libro de Reclamaciones. |
| **C15 (Revisión de productos regulados)** | EN REVISIÓN | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Módulos de especies y farmacia listos en backend. Pendiente registro SENASA y colegiatura de regente. |
| **C16 (Aprobación comercial final)** | PENDIENTE | Evaluación de Calidad y Requisitos | `Consolidado de 7 hojas de negocio` | VERIFICADO EN SISTEMA | SÍ | Bloqueado hasta recibir y validar todos los puntos anteriores. No se habilitará checkout sin aprobación. |