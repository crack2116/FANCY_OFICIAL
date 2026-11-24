/**
 * UI copy dictionary.
 *
 * The upstream starter hardcoded every user-visible string in English and ships
 * no i18n layer. Rather than pull in an i18n dependency, this is a flat,
 * typed dictionary plus a `t()` lookup. Code identifiers stay in English; only
 * visible copy is translated.
 *
 * Adding a key here is the only way to add copy. Keys are namespaced by area.
 */

export const esPE = {
  // --- announcement bar ---------------------------------------------------
  "announcement.label": "Aviso",

  // --- header -------------------------------------------------------------
  "header.searchPlaceholder": "Buscar productos...",
  "header.searchLabel": "Buscar",
  "header.openSearch": "Abrir búsqueda",
  "header.openMenu": "Abrir menú",
  "header.closeMenu": "Cerrar menú",
  "header.account": "Mi cuenta",
  "header.cart": "Carrito",
  "header.cartWithCount": "Carrito ({count})",
  "header.skipToContent": "Saltar al contenido principal",

  // --- navigation ---------------------------------------------------------
  "nav.label": "Navegación principal",
  "nav.perros": "Perros",
  "nav.gatos": "Gatos",
  "nav.alimentos": "Alimentos",
  "nav.salud": "Salud",
  "nav.farmacia": "Farmacia",
  "nav.higiene": "Higiene",
  "nav.accesorios": "Accesorios",
  "nav.juguetes": "Juguetes",
  "nav.ofertas": "Ofertas",
  "nav.clearance": "Liquidación",
  "nav.home": "Inicio",
  "nav.store": "Tienda",
  "nav.allProducts": "Todos los productos",
  "nav.categories": "Categorías",
  "nav.noCategories": "Todavía no hay categorías disponibles.",
  "nav.wishlist": "Favoritos",
  "nav.wishlistWithCount": "Favoritos ({count})",

  // --- search -------------------------------------------------------------
  "search.title": "Buscar",
  "search.close": "Cerrar búsqueda",
  "search.startTyping": "Escribe para buscar productos.",
  "search.searching": "Buscando…",
  "search.noResults": 'No encontramos productos para "{query}".',
  "search.error": "No pudimos buscar productos.",
  "search.clear": "Limpiar búsqueda",
  "search.minLength": "Escribe al menos {count} caracteres para buscar.",
  "search.viewAll": "Ver todos los resultados",
  "search.suggestionsLabel": "Sugerencias",

  // --- product card / actions --------------------------------------------
  "product.addToCart": "Agregar al carrito",
  "product.selectVariant": "Elegir variante",
  "product.variant": "Variante",
  "product.selectOptions": "Elegir opciones",
  "product.outOfStock": "Agotado",
  "product.inStock": "Disponible",
  "product.lowStock": "Pocas unidades",
  "product.sale": "Oferta",
  "product.new": "Nuevo",
  "product.priceFrom": "Desde",
  "product.originalPrice": "Precio original",
  "product.quantity": "Cantidad",
  "product.viewDetails": "Ver detalle de {title}",
  "product.viewProduct": "Ver producto",
  "product.brandFallback": "Sin marca",
  "product.priceOriginalLabel": "Precio original",
  "product.selectOptionTitle": "Elige {title}",
  "product.optionsLegend": "Opciones de {title}",
  "product.quantityDecrease": "Reducir cantidad",
  "product.quantityIncrease": "Aumentar cantidad",
  "product.quantityValue": "{count} unidades",
  "product.quantityMax": "Stock disponible: {count}",
  "product.quantityUnlimited": "Sin límite de stock",
  "product.addedToCart": "Producto agregado al carrito",
  "product.addToCartError": "No pudimos agregar el producto al carrito.",
  "product.descriptionHeading": "Descripción",
  "product.detailsHeading": "Detalles",
  "product.detailsMaterial": "Material",
  "product.detailsOrigin": "Origen",
  "product.detailsType": "Tipo",
  "product.detailsWeight": "Peso",
  "product.detailsDimensions": "Dimensiones",
  "product.imageAlt": "Imagen del producto",
  "product.detailsNotReported": "No informado",
  "product.galleryImageAlt": "Imagen {number} de {title}",
  "product.galleryThumbnail": "Ver imagen {number} de {title}",
  "product.zoom.hint": "Pasa el cursor o haz clic para hacer zoom",
  "product.zoom.open": "Ampliar imagen",
  "product.zoom.close": "Cerrar visor",
  "product.zoom.in": "Acercar imagen",
  "product.zoom.out": "Alejar imagen",
  "product.zoom.reset": "Restablecer zoom",
  "product.zoom.prev": "Imagen anterior",
  "product.zoom.next": "Imagen siguiente",
  "product.breadcrumb.label": "Ruta de navegación",
  "product.breadcrumb.home": "Inicio",
  "product.breadcrumb.store": "Tienda",
  "product.relatedHeading": "Productos relacionados",
  "product.relatedSubtitle": "Otros productos que puedes revisar.",

  // --- cart ---------------------------------------------------------------
  "cart.title": "Carrito",
  "cart.summary": "Resumen",
  "cart.empty": "Tu carrito está vacío.",
  "cart.emptyHint": "Agrega productos para comenzar.",
  "cart.explore": "Ver productos",
  "cart.subtotal": "Subtotal",
  "cart.shipping": "Envío",
  "cart.shippingPending": "Por calcular",
  "cart.taxes": "Impuestos",
  "cart.discount": "Descuento",
  "cart.total": "Total",
  "cart.remove": "Quitar",
  "cart.removeItem": "Quitar {title} del carrito",
  "cart.checkout": "Finalizar compra",
  "cart.goToCart": "Ir al carrito",
  "cart.viewCart": "Ver carrito",
  "cart.continueShopping": "Seguir comprando",
  "cart.quantityLabel": "Cantidad de {title}",
  "cart.item": "Producto",
  "cart.itemCountSingle": "{count} producto",
  "cart.itemCountPlural": "{count} productos",
  "cart.price": "Precio",
  "cart.meta.title": "Carrito",
  "cart.meta.description": "Revisa los productos de tu carrito.",
  "cart.signIn.title": "¿Ya tienes una cuenta?",
  "cart.signIn.body": "Inicia sesión para una mejor experiencia.",
  "cart.signIn.cta": "Iniciar sesión",

  // --- account ------------------------------------------------------------
  "account.title": "Mi cuenta",
  "account.login": "Iniciar sesión",
  "account.logout": "Cerrar sesión",
  "account.orders": "Pedidos",
  "account.addresses": "Direcciones",
  "account.profile": "Perfil",
  "account.overview": "Resumen",

  // --- checkout -----------------------------------------------------------
  "checkout.promo.error": "No pudimos aplicar ese código. Revísalo e inténtalo de nuevo.",
  "checkout.address.error": "No pudimos guardar las direcciones. Revisa los campos.",
  "checkout.payment.error": "No pudimos cargar los métodos de pago.",
  "checkout.payment.failed":
    "No pudimos procesar tu pago. Revisa los datos de tu tarjeta e inténtalo de nuevo.",
  "checkout.order.error": "No pudimos confirmar tu pedido. Inténtalo de nuevo.",
  "checkout.shipping.error":
    "No pudimos elegir ese método de envío. Elige otro e inténtalo de nuevo.",
  "checkout.title": "Finalizar compra",
  "checkout.backToCart": "Volver al carrito",
  "checkout.back": "Volver",
  "checkout.delivery": "Entrega",
  "checkout.payment": "Pago",
  "checkout.review": "Revisar",
  "checkout.continue": "Continuar",
  "checkout.meta.title": "Finalizar compra",
  "checkout.meta.description":
    "Completa los datos de envío y pago de tu pedido.",
  "checkout.address.shippingTitle": "Dirección de envío",
  "checkout.address.billingTitle": "Dirección de facturación",
  "checkout.address.contactTitle": "Contacto",
  "checkout.address.edit": "Editar",
  "checkout.address.sameAsShipping":
    "La dirección de facturación es la misma que la de envío",
  "checkout.address.sameSummary":
    "La dirección de facturación y la de entrega son la misma.",
  "checkout.address.emptySummary": "Agrega tu dirección de envío.",
  "checkout.address.emptyBilling": "Agrega tu dirección de facturación.",
  "checkout.address.emptyContact": "Sin datos de contacto.",
  "checkout.address.useSaved":
    "Hola {name}, ¿quieres usar una de tus direcciones guardadas?",
  "checkout.address.useSavedGeneric":
    "¿Quieres usar una de tus direcciones guardadas?",
  "checkout.address.choose": "Elige una dirección",
  "checkout.address.continue": "Continuar con la entrega",
  "checkout.address.email": "Correo electrónico",
  "checkout.address.emailInvalid": "Ingresa un correo válido.",
  "checkout.delivery.method": "Método de envío",
  "checkout.delivery.methodHint": "¿Cómo deseas recibir tu pedido?",
  "checkout.delivery.pickup": "Recoger mi pedido",
  "checkout.delivery.store": "Tienda",
  "checkout.delivery.chooseStore": "Elige una tienda cercana",
  "checkout.delivery.continue": "Continuar con el pago",
  "checkout.delivery.edit": "Editar",
  "checkout.delivery.methodSummary": "Método",
  "checkout.payment.method": "Método de pago",
  "checkout.payment.methodGiftCard": "Tarjeta de regalo",
  "checkout.payment.details": "Datos de pago",
  "checkout.payment.enterDetails": "Ingresa los datos de pago",
  "checkout.payment.enterDetailsLabel": "Ingresa los datos de tu pago:",
  "checkout.payment.anotherStep": "A continuación se mostrará otro paso",
  "checkout.payment.continue": "Continuar para revisar",
  "checkout.payment.selectMethod": "Selecciona un método de pago",
  "checkout.payment.placeOrder": "Confirmar pedido",
  "checkout.payment.test": "Atención: solo para pruebas.",
  "checkout.payment.creditCard": "Tarjeta de crédito",
  "checkout.review.terms":
    "Al confirmar el pedido, confirmas que has leído y aceptas las condiciones de compra y la política de privacidad de la tienda.",
  "checkout.summary.title": "En tu carrito",
  "checkout.promo.add": "Agregar código de promoción",
  "checkout.promo.placeholder": "Código de descuento",
  "checkout.promo.apply": "Aplicar",
  "checkout.promo.applied": "Promociones aplicadas:",
  "checkout.promo.remove": "Quitar código de promoción del pedido",
  "checkout.secureBadge": "Compra segura",
  "checkout.review.title": "Revisar y confirmar",
  "checkout.delivery.empty":
    "No hay métodos de envío disponibles para esta dirección todavía.",
  "cart.trustLine": "Compra protegida · Cambios y devoluciones fáciles",
  "checkout.freeShipping.unlocked": "¡Envío gratis desbloqueado!",
  "checkout.freeShipping.unlock": "Desbloquea el envío gratis",
  "checkout.freeShipping.only": "Solo te faltan",
  "checkout.freeShipping.away": "para el envío gratis",
  "checkout.freeShipping.viewCart": "Ver carrito",
  "checkout.freeShipping.viewProducts": "Ver productos",

  // --- generic ------------------------------------------------------------
  "common.loading": "Cargando…",
  "common.close": "Cerrar",
  "common.menu": "Menú",
  "common.new": "Nuevo",
  "common.sale": "Oferta",
  "common.notAvailable": "No disponible",
  "common.select": "Seleccionar…",
  "common.edit": "Editar",
  "common.original": "Original:",
  "common.language": "Idioma:",
  "common.default": "Predeterminado",
  "common.poweredBy": "Desarrollado con",
  "common.transferCartError": "No pudimos transferir tu carrito.",
  "common.retryTransfer": "Reintentar transferencia",
  "common.transferring": "Transfiriendo…",
  "common.showPassword": "Mostrar contraseña",
  "common.hidePassword": "Ocultar contraseña",

  // --- region / layout ----------------------------------------------------
  "layout.shippingTo": "Envíos a:",

  // --- errors -------------------------------------------------------------
  // Deliberately generic. A shopper cannot act on a Medusa error payload, and
  // rendering one leaks internal ids and field names.
  //
  // The `error.*` keys below are the shopper-facing copy for the classified
  // failures in `src/lib/errors/public-error.ts`. They are the only strings the
  // error layer is allowed to return, which is what keeps backend text out of
  // the UI.
  "error.notFound.title": "Página no encontrada",
  "error.notFound.backHome": "Ir al inicio",
  "error.notFound.description":
    "La página que buscas no existe o cambió de dirección.",
  "error.cartNotFound.title": "No encontramos ese carrito",
  "error.cartNotFound.description":
    "Es posible que el carrito haya caducado. Vuelve a la tienda para empezar uno nuevo.",

  // Classification defaults, keyed by PublicErrorCode.
  "error.generic": "Ocurrió un problema. Intenta nuevamente.",
  "error.network": "No pudimos conectarnos. Intenta nuevamente.",
  "error.rateLimited": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  "error.auth.sessionExpired": "Tu sesión expiró. Vuelve a iniciar sesión.",
  "error.auth.emailRegistered": "Ya existe una cuenta con ese correo.",
  "error.stock.insufficient": "Este producto ya no tiene stock suficiente.",
  "error.cart.notFound": "No pudimos recuperar tu carrito.",
  "error.cart.updateFailed": "No pudimos actualizar tu carrito. Intenta nuevamente.",
  

  // --- order confirmation -------------------------------------------------
  "order.confirmed.title": "Pedido confirmado",
  "order.confirmed.description": "Registramos tu pedido correctamente.",

  // --- onboarding banner --------------------------------------------------
  // Only rendered while Medusa's `_medusa_onboarding` cookie is set.
  "onboarding.title": "Tu pedido de prueba se creó correctamente.",
  "onboarding.body":
    "La tienda todavía está en configuración: revisa el catálogo, los envíos y los medios de pago antes de recibir pedidos reales.",
  "onboarding.action": "Terminar la configuración",

// --- order transfer -----------------------------------------------------
  "order.transfer.request.title": "Solicitud de transferencia",
  "order.transfer.request.description":
    "Si hiciste un pedido sin iniciar sesión, puedes vincularlo a tu cuenta.",
  "order.transfer.request.heading":
    "Solicitud de transferencia del pedido {id}",
  "order.transfer.request.fieldLabel": "Número de pedido",
  "order.transfer.request.placeholder": "Por ejemplo, 12",
  "order.transfer.request.action": "Solicitar transferencia",
  "order.transfer.request.sentTo": "Enviamos el enlace de aprobación a {email}.",
  "order.transfer.request.body":
    "Recibiste una solicitud para transferir la titularidad del pedido {id}. Si estás de acuerdo, puedes aprobarla con el botón de abajo.",
  "order.transfer.request.consequence":
    "Si aceptas, la nueva persona titular asume todas las responsabilidades y permisos asociados a este pedido.",
  "order.transfer.request.declineHint":
    "Si no reconoces la solicitud o prefieres conservar la titularidad, no necesitas hacer nada más.",
  "order.transfer.accepted.title": "Pedido transferido",
  "order.transfer.accepted.description":
    "El pedido {id} pasó al nuevo titular.",
  "order.transfer.declined.title": "Transferencia rechazada",
  "order.transfer.declined.description":
    "El pedido {id} se quedó con su titular actual.",
  "order.transfer.failed.title": "No pudimos completar la transferencia",
  "order.transfer.failed.description": "Inténtalo de nuevo en unos minutos.",
  "order.transfer.actions.accept": "Aceptar transferencia",
  "order.transfer.actions.decline": "Rechazar transferencia",
  "order.transfer.actions.accepted": "Pedido transferido correctamente.",
  "order.transfer.actions.declined": "Transferencia rechazada correctamente.",
  "order.transfer.error":
    "No pudimos completar la transferencia. Inténtalo de nuevo en unos minutos.",
  "order.transfer.error.missingId":
    "Ingresa el número de pedido para solicitar la transferencia.",

  // --- order: manual payment ---------------------------------------------
  "order.manualPayment.title": "Información y Validación de Pago Manual",
  "order.manualPayment.officialAccounts": "Cuentas Oficiales para Abono:",
  "order.manualPayment.pendingTitle":
    "Cuentas comerciales pendientes de confirmación:",
  "order.manualPayment.pendingBody":
    "El comercio aún no ha publicado los números de cuenta oficiales. Por favor contacta al comercio para coordinar el abono de tu pedido.",
  "order.manualPayment.verifiedTitle": "Pago Verificado y Confirmado",
  "order.manualPayment.verifiedBody":
    "El abono fue validado en cuenta por el equipo administrativo. Tu pedido está en preparación.",
  "order.manualPayment.rejectedTitle": "Comprobante No Conciliado",
  "order.manualPayment.rejectedBody":
    "El número de operación no figura en los extractos bancarios. Por favor contáctanos con tu voucher.",
  "order.manualPayment.pendingVerificationTitle":
    "Comprobante en Proceso de Verificación",
  "order.manualPayment.operationNumber": "Nº de Operación:",
  "order.manualPayment.pendingVerificationBody":
    "Tu pago está pendiente de validación bancaria por administración antes de liberar el despacho.",
  "order.manualPayment.referenceLabel":
    "Ingresa tu Nº de Operación / Referencia de Pago:",
  "order.manualPayment.referencePlaceholder": "Ej: 849201",
  "order.manualPayment.methodBankTransfer": "Transferencia Bancaria",
  "order.manualPayment.submit": "Registrar Comprobante",
  "order.manualPayment.errorReferenceRequired":
    "Por favor ingresa el número de operación o referencia de tu abono.",
  "order.manualPayment.errorSubmit":
    "No se pudo registrar la referencia. Inténtalo nuevamente.",
  "order.manualPayment.success":
    "Referencia registrada con éxito. La administración validará el ingreso antes del despacho.",

  // --- account: verification ---------------------------------------------
  // Email verification is deliberately NOT enabled in this build: no email
  // provider is configured, so a verification mail can never leave the server.
  "account.verify.description":
    "La tienda todavía no envía correos de verificación.",
  "account.verify.error":
    "Ese enlace de verificación no es válido o ya se usó. Intenta iniciar sesión de nuevo.",

  // --- account: errors ---------------------------------------------------
  // Generic on purpose. The backend's message can carry internal ids, field
  // names or a stack, none of which a shopper can act on.
  "account.login.error.generic":
    "No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.",
  "account.login.error.invalidCredentials":
    "El correo o la contraseña no coinciden.",
  "account.login.error.unsupportedMethod":
    "Ese método de acceso no está disponible en esta tienda.",
  "account.login.error.cartTransfer":
    "Iniciamos sesión, pero no pudimos pasar tu carrito. Revisa el carrito al entrar.",
  "account.register.error.generic":
    "No pudimos crear tu cuenta. Revisa los datos e inténtalo de nuevo.",
  "account.address.error": "No pudimos guardar la dirección. Revisa los campos.",
  "account.address.error.missingId":
    "No pudimos identificar esa dirección. Recarga la página e inténtalo de nuevo.",

  // --- footer -------------------------------------------------------------
  "footer.tagline": "Cuidado veterinario para tu mejor amigo.",
  "footer.comprar": "Comprar",
  "footer.ayuda": "Ayuda",
  "footer.cuenta": "Mi cuenta",
  "footer.legal": "Legal",
  "footer.tienda": "Tienda",
  "footer.ofertas": "Ofertas",
  "footer.nuevos": "Novedades",
  "footer.envios": "Envíos",
  "footer.devoluciones": "Devoluciones",
  "footer.preguntas": "Preguntas frecuentes",
  "footer.contacto": "Contacto",
  "footer.miCuenta": "Mi cuenta",
  "footer.pedidos": "Mis pedidos",
  "footer.direcciones": "Mis direcciones",
  "footer.terminos": "Términos y condiciones",
  "footer.privacidad": "Política de privacidad",
  "footer.libroReclamaciones": "Libro de reclamaciones",
  "footer.followUs": "Síguenos",
  "footer.paymentMethods": "Métodos de pago",
  "footer.paymentPending": "Pendientes de confirmación.",
  "footer.rights": "© {year} {name}. Todos los derechos reservados.",
  "footer.placeholderNote":
    "Información legal y de contacto pendiente de confirmación.",
  "footer.cta.title": "Cuidado para tu mascota, todos los días",
  "footer.cta.subtitle":
    "Encuentra alimentos, salud y accesorios en un solo lugar.",
  "footer.cta.action": "Explorar la tienda",

  // --- benefits -----------------------------------------------------------
  "benefits.title": "Por qué comprarnos",
  "benefits.shipping.title": "Envíos en Piura",
  "benefits.shipping.description":
    "Recibe rápido en Piura, Castilla y Veintiséis de Octubre.",
  "benefits.quality.title": "Productos originales",
  "benefits.quality.description":
    "Trabajamos con marcas y distribuidores autorizados.",
  "benefits.support.title": "Asesoría en cuidado",
  "benefits.support.description":
    "Te ayudamos a elegir lo adecuado para tu perro.",
  "benefits.returns.title": "Cambios simples",
  "benefits.returns.description": "Gestiona tus cambios desde tu cuenta.",
  "benefits.secure.title": "Compra segura",
  "benefits.secure.description":
    "Revisa tu pedido y el total antes de confirmar el pago.",
  "benefits.selection.title": "Productos seleccionados",
  "benefits.selection.description":
    "Publicamos solo productos con información clara y fotos del catálogo.",

  // --- home: trust strip ---------------------------------------------------
  "home.trust.support.title": "Atención personalizada",
  "home.trust.support.description": "Te orientamos al elegir",
  "home.trust.catalogue.title": "Alimento, salud e higiene",
  "home.trust.catalogue.description": "Todo el cuidado de tu mascota",
  "home.trust.pickup.title": "Recojo en tienda",
  "home.trust.pickup.description": "Coordina tu recojo",
  "home.trust.secure.title": "Compra segura",
  "home.trust.secure.description": "Revisa tu pedido antes de pagar",

  // --- home: metadata -----------------------------------------------------
  "home.meta.title": "Tienda de productos para mascotas en Piura",
  "home.meta.description":
    "Compra alimentos, salud, higiene, accesorios y juguetes para tu mascota. Precios en soles y envíos rápidos en Piura.",

  // --- home: hero carousel ------------------------------------------------
  "home.hero.label": "Portada de la tienda",
  "home.hero.eyebrow.store": "Tienda en Piura",
  "home.hero.eyebrow.care": "Cuidado de tu mascota",
  "home.hero.slide1.title": "Todo para cuidar a tu mejor amigo",
  "home.hero.slide1.subtitle":
    "Alimentos, higiene, paseo y diversión en un solo lugar para que tu perro viva bien todos los días.",
  "home.hero.slide1.cta": "Explorar productos",
  "home.hero.slide1.alt":
    "Ilustración de un perro y un gato sentados juntos con un tazón de alimento",
  "home.hero.slide2.title": "Bienestar todos los días",
  "home.hero.slide2.subtitle":
    "Productos seleccionados para acompañar a tu mascota en cada etapa.",
  "home.hero.slide2.cta": "Ver alimentos",
  "home.hero.slide2.secondaryCta": "Ver cuidados",
  "home.hero.slide2.alt":
    "Ilustración de un perro y un gato con sus accesorios de cuidado",
  "home.hero.previous": "Portada anterior",
  "home.hero.next": "Portada siguiente",
  "home.hero.play": "Reproducir la portada",
  "home.hero.pause": "Pausar la portada",
  "home.hero.goTo": "Ir a la portada {number}",
  "home.hero.status": "Portada {current} de {total}",
  "home.hero.secondaryCta": "Ver categorías",
  "home.hero.badge.title": "Compra con confianza",
  "home.hero.badge.description": "Atención personalizada",

  // --- home: category showcase -------------------------------------------
  "home.categories.label": "Categorías de la tienda",
  "home.categories.title": "Compra por categoría",
  "home.categories.eyebrow": "Explora la tienda",
  "home.petTypes.title": "Por tipo de mascota",
  "home.petTypes.subtitle":
    "Todo lo que tu mascota necesita, ordenado por categoría",
  "home.categories.subtitle":
    "Elige por lo que necesitas hoy y encuentra los productos de esa sección.",
  "home.categories.cta": "Ver categoría",
  "home.categories.viewAll": "Ver todas las categorías",
  "home.categories.imageAlt.alimentos": "Ilustración de alimento para perros",
  "home.categories.imageAlt.salud": "Ilustración de un producto de salud",
  "home.categories.imageAlt.higiene": "Ilustración de productos de higiene",
  "home.categories.imageAlt.accesorios": "Ilustración de un accesorio para perros",
  "home.categories.imageAlt.juguetes": "Ilustración de juguetes para perros",
  "home.categories.imageAlt.farmacia": "Ilustración de un producto de farmacia",

  // --- home: product rails ------------------------------------------------
  "home.rails.featured.title": "Productos del mes",
  "home.rails.featured.subtitle": "Los mejores artículos para esta temporada",
  "home.rails.new.title": "Nuevos productos",
  "home.rails.new.subtitle": "Lo último que se incorporó al catálogo.",
  "home.rails.offers.title": "Ofertas",
  "home.rails.offers.subtitle":
    "Productos con precio rebajado, según el catálogo.",
  "home.rails.viewAll": "Ver todo",
  "home.rails.eyebrow": "Selección Fancy Pets",
  "home.rails.previous": "Anterior",
  "home.rails.next": "Siguiente",
  "home.rails.pagination": "Paginación de {label}",
  "home.rails.goToPage": "Ir a la página {page} de {label}",
  "home.rails.filterByCategory": "Filtrar {label} por categoría",
  "home.rails.allCategories": "Todos",
  "home.rails.endCard.title": "Descubre toda la selección",
  "home.rails.endCard.body":
    "Explora alimentos, higiene y accesorios para tu mascota.",
  "home.rails.endCard.cta": "Explorar catálogo",

  // --- wishlist ------------------------------------------------------------
  // Device-scoped: these labels must never imply the list follows the shopper
  // to another browser, because nothing here does that.
  "wishlist.add": "Agregar {title} a favoritos",
  "wishlist.remove": "Quitar {title} de favoritos",

  // --- home: secondary banner --------------------------------------------
  "home.banner.eyebrow": "Cuidado en casa",
  "home.banner.title": "Baño, cepillado y paseo diario",
  "home.banner.subtitle":
    "Lo básico de cada semana para mantener su pelaje limpio, su salud al día y sus paseos cómodos.",
  "home.banner.cta": "Ver todo el catálogo",
  "home.banner.secondaryCta": "Explorar higiene",
  "home.banner.pillar.hygiene.title": "Todo para la hora del baño",
  "home.banner.pillar.hygiene.description":
    "Shampoos de uso frecuente, acondicionadores, toallas absorbentes y limpieza de oídos y patitas.",
  "home.banner.pillar.health.title": "Cepillado y cuidado dental",
  "home.banner.pillar.health.description":
    "Cardas, cepillos quita-pelos, pastas dentales y suplementos para cuidar su piel y dientes.",
  "home.banner.pillar.accessories.title": "Collares, correas y camas",
  "home.banner.pillar.accessories.description":
    "Arneses seguros para la calle y camas acolchadas lavables para que descanse en casa.",
  "home.banner.imageAlt":
    "Perro limpio envuelto en una toalla de algodón beige en una sala luminosa",

  // --- empty states -------------------------------------------------------
  "empty.state.title": "No hay productos para mostrar",
  "empty.state.category":
    "Esta categoría todavía no tiene productos publicados. Puedes explorar el catálogo completo.",
  "empty.state.categoryWithChildren":
    "Esta categoría agrupa otras categorías. Elige una de las opciones para ver sus productos.",
  "empty.state.collection":
    "Esta colección todavía no tiene productos publicados.",
  "empty.state.browseStore": "Ver todos los productos",
  "empty.state.browseCategories": "Ver categorías",
  "empty.state.error.title": "No pudimos cargar el contenido",
  "empty.state.error.description":
    "Intenta de nuevo en unos minutos. Si el problema continúa, escríbenos.",

  // --- store listing ------------------------------------------------------
  "store.eyebrow": "Catálogo",
  "store.title": "Todos los productos",
  "store.description":
    "Explora alimentos, salud, higiene y accesorios para tu mascota.",
  "store.noResults": "No encontramos productos con estos filtros.",
  "store.noResults.description":
    "Prueba quitando algún filtro o explora otras categorías.",
  "store.loadError": "No pudimos cargar los productos.",
  "store.loadError.description":
    "Intenta de nuevo en unos minutos. Si el problema continúa, escríbenos.",

  // --- catalogue: results header ------------------------------------------
  "catalogue.results.label": "Resultados",
  "catalogue.results.count": "{count} productos",
  "catalogue.results.countOne": "1 producto",
  "catalogue.results.searchHeading": 'Resultados de "{query}"',

  // --- catalogue: in-page search ------------------------------------------
  "catalogue.search.label": "Buscar en el catálogo",
  "catalogue.search.placeholder": "Buscar productos",
  "catalogue.search.clear": "Limpiar búsqueda",

  // --- catalogue: pet attributes ------------------------------------------
  // Closed enums, so these are exhaustive: every stored value has a label and
  // there is no fallback to reach.
  "catalogue.pet.lifeStage.puppy": "Cachorro",
  "catalogue.pet.lifeStage.adult": "Adulto",
  "catalogue.pet.lifeStage.senior": "Senior",
  "catalogue.pet.lifeStage.all": "Todas las etapas",
  "catalogue.pet.petSize.small": "Raza pequeña",
  "catalogue.pet.petSize.medium": "Raza mediana",
  "catalogue.pet.petSize.large": "Raza grande",
  "catalogue.pet.petSize.all": "Todos los tamaños",
  // Species is DATA, not code: the store may add `rabbit`, `bird`. These are the
  // codes this build knows how to name; anything else falls back to the code
  // itself, which is data rather than copy. See `speciesLabel`.
  "catalogue.pet.species.dog": "Perro",
  "catalogue.pet.species.cat": "Gato",
  "catalogue.pet.species.other": "Otro",

  // --- catalogue: filters -------------------------------------------------
  "catalogue.filters.title": "Filtrar",
  "catalogue.filters.open": "Filtrar",
  "catalogue.filters.openWithCount": "Filtrar ({count})",
  "catalogue.filters.close": "Cerrar filtros",
  "catalogue.filters.clear": "Limpiar filtros",
  "catalogue.filters.category": "Categoría",
  "catalogue.filters.categoryAll": "Todas las categorías",
  "catalogue.filters.price": "Precio",
  "catalogue.filters.priceFrom": "Desde",
  "catalogue.filters.priceTo": "Hasta",
  "catalogue.filters.priceHint": "Precios del catálogo: {min} a {max}.",
  
  "catalogue.filters.priceInvalid": "Ingresa un monto válido.",
  "catalogue.filters.stock": "Disponibilidad",
  "catalogue.filters.inStock": "En stock",
  "catalogue.filters.brand": "Marca",
  "catalogue.filters.brandAll": "Todas las marcas",
  "catalogue.filters.species": "Especie",
  "catalogue.filters.lifeStage": "Etapa de vida",
  "catalogue.filters.lifeStageAll": "Todas las etapas",

  // --- catalogue: sort ----------------------------------------------------
  "catalogue.sort.title": "Ordenar por",
  "catalogue.sort.open": "Ordenar",
  "catalogue.sort.relevance": "Relevancia",
  "catalogue.sort.priceAsc": "Precio: menor a mayor",
  "catalogue.sort.priceDesc": "Precio: mayor a menor",
  "catalogue.sort.createdAt": "Más recientes",

  // --- catalogue: offers -------------------------------------------------
  "catalogue.offers.description":
    "Productos con precio rebajado en la colección de ofertas de la tienda.",
  "catalogue.offers.empty":
    "La colección de ofertas no tiene productos publicados por ahora.",

  // --- product: pet attributes --------------------------------------------
  // Commercial information about what a product is made for. Deliberately NOT
  // framed as veterinary advice: a shop sells products, it does not diagnose an
  // animal. Nothing here recommends treating, curing or preventing anything.
  "product.petInfo.heading": "Información del producto",
  "product.petInfo.brandLabel": "Marca",
  "product.petInfo.speciesLabel": "Especie",
  "product.petInfo.lifeStageLabel": "Etapa de vida",
  "product.petInfo.petSizeLabel": "Tamaño recomendado",
  "product.petInfo.viewBrand": "Ver todos los productos de {brand}",

  // --- brands --------------------------------------------------------------
  "brand.index.metaTitle": "Marcas",
  "brand.index.metaDescription":
    "Explora los productos de cada marca disponible en nuestra tienda para perros.",
  "brand.index.heading": "Marcas",
  "brand.index.subtitle":
    "Elige una marca para ver todos sus productos.",
  "brand.index.productCount": "{count} productos",
  "brand.index.productCountOne": "1 producto",
  "brand.index.empty":
    "Todavía no hay marcas publicadas en la tienda.",
  "brand.index.allBrands": "Ver todas las marcas",
  "brand.page.metaDescription": "Productos de la marca {brand}.",
  "brand.page.allBrands": "Todas las marcas",
  "brand.page.empty":
    "Esta marca todavía no tiene productos publicados.",
  "brand.page.browseAll": "Explorar todo el catálogo",

  // --- account: page titles ----------------------------------------------
  "account.meta.title": "Mi cuenta",
  "account.meta.description":
    "Inicia sesión para ver tus pedidos, tus direcciones y tus datos de contacto.",
  "account.overview.description": "Resumen de la actividad de tu cuenta.",
  "account.orders.description": "Revisa tus pedidos anteriores y su estado.",
  "account.orders.body":
    "Consulta tus pedidos anteriores y su estado. También puedes registrar una devolución o un cambio.",
  "account.profile.description": "Consulta y actualiza los datos de tu cuenta.",
  "account.profile.body":
    "Actualiza tu nombre y tu teléfono. Tu correo se muestra aquí como referencia.",
  "account.addresses.description": "Consulta y actualiza tus direcciones de envío.",
  "account.addresses.body":
    "Guarda las direcciones que quieras usar al recibir tus pedidos.",
  "account.favorites": "Mis favoritos",
  "account.favorites.description":
    "Consulta los productos que guardaste en favoritos.",
  "account.favorites.body":
    "Aquí ves los productos que marcaste con corazón en este navegador.",
  "account.favorites.empty.title": "Aún no tienes favoritos guardados.",
  "account.favorites.empty.body":
    "Toca el corazón en cualquier producto de la tienda para tenerlo siempre a mano.",
  "account.favorites.empty.cta": "Explorar productos",
  "account.favorites.count": "{count} favoritos",
  "account.favorites.countOne": "1 favorito",
  "account.order.title": "Pedido n.º {id}",
  "account.order.description": "Detalle de uno de tus pedidos.",

  // --- account: navigation ------------------------------------------------
  // `aria-current="page"` is set on the link that matches the section, so the
  // labels are reused by both the desktop sidebar and the mobile list.
  "account.nav.label": "Secciones de tu cuenta",
  "account.nav.overview": "Resumen",
  "account.nav.profile": "Mis datos",
  "account.nav.addresses": "Direcciones",
  "account.nav.orders": "Mis pedidos",
  "account.nav.favorites": "Favoritos",
  "account.nav.logout": "Cerrar sesión",
  "account.nav.current": "Sección actual",
  "account.menu.label": "Menú de mi cuenta",
  "account.menu.overview": "Resumen de cuenta",
  "account.menu.viewStore": "Seguir comprando",

  // --- account: dashboard --------------------------------------------------
  "account.dashboard.greeting": "Hola, {name}",
  "account.dashboard.greeting.anonymous": "Mi cuenta",
  "account.dashboard.signedInAs": "Sesión iniciada con {email}",
  "account.dashboard.card.orders.title": "Mis pedidos",
  "account.dashboard.card.orders.body":
    "Revisa el estado y el detalle de cada pedido.",
  "account.dashboard.card.orders.count": "{count} pedidos",
  "account.dashboard.card.orders.countOne": "1 pedido",
  "account.dashboard.card.orders.empty": "Todavía no tienes pedidos.",
  "account.dashboard.card.profile.title": "Mis datos",
  "account.dashboard.card.profile.body":
    "Actualiza tu nombre, tus apellidos y tu teléfono.",
  "account.dashboard.card.profile.emptyPhone": "Sin teléfono registrado",
  "account.dashboard.card.addresses.title": "Direcciones",
  "account.dashboard.card.addresses.body":
    "Guarda las direcciones con las que quieres recibir tus pedidos.",
  "account.dashboard.card.addresses.count": "{count} direcciones",
  "account.dashboard.card.addresses.countOne": "1 dirección",
  "account.dashboard.card.addresses.empty": "Todavía no guardas direcciones.",
  "account.dashboard.card.favorites.title": "Favoritos",
  "account.dashboard.card.favorites.body":
    "Accede rápido a los productos que marcaste con corazón.",
  "account.dashboard.card.favorites.empty": "Aún no guardas favoritos.",
  "account.dashboard.action": "Ver",
  "account.dashboard.lastOrder.title": "Último pedido",
  "account.dashboard.help.title": "¿Necesitas ayuda con un pedido?",
  "account.dashboard.help.body":
    "Abre el detalle del pedido: ahí verás el estado del pago, el estado del envío y los datos de entrega.",
  "account.dashboard.help.cta": "Ver mis pedidos",

  // --- account: profile ---------------------------------------------------
  "account.profile.section.name": "Nombre",
  "account.profile.section.phone": "Teléfono",
  "account.profile.section.email": "Correo electrónico",
  "account.profile.field.firstName": "Nombre",
  "account.profile.field.lastName": "Apellidos",
  "account.profile.field.phone": "Teléfono",
  "account.profile.field.phoneHint": "Incluye el código de país, por ejemplo +51.",
  "account.profile.field.email": "Correo electrónico",
  "account.profile.edit": "Editar",
  "account.profile.cancel": "Cancelar",
  "account.profile.save": "Guardar cambios",
  "account.profile.saving": "Guardando…",
  "account.profile.saved": "Tus datos se actualizaron correctamente.",
  "account.profile.error": "No pudimos actualizar tus datos.",
  "account.profile.error.firstName": "Ingresa tu nombre.",
  "account.profile.error.lastName": "Ingresa tus apellidos.",
  "account.profile.error.phone": "Ingresa un teléfono válido.",
  "account.profile.error.email": "Ingresa un correo válido.",
  "account.profile.email.readonlyNote":
    "El cambio de correo estará disponible próximamente.",
  "account.profile.email.hint":
    "Este es el correo con el que iniciaste sesión y al que enviamos la confirmación de tus pedidos.",
  "account.profile.phone.empty": "Todavía no guardas un teléfono.",

  // --- account: addresses -------------------------------------------------
  "account.addresses.add": "Nueva dirección",
  "account.addresses.addTitle": "Agregar dirección",
  "account.addresses.editTitle": "Editar dirección",
  "account.addresses.save": "Guardar dirección",
  "account.addresses.cancel": "Cancelar",
  "account.addresses.created": "Guardamos tu dirección.",
  "account.addresses.updated": "Actualizamos tu dirección.",
  "account.addresses.removed": "Eliminamos esa dirección.",
  "account.addresses.delete": "Eliminar",
  "account.addresses.deleteConfirm.title": "¿Eliminar esta dirección?",
  "account.addresses.deleteConfirm.body":
    "La quitamos de tu cuenta. No afecta a los pedidos que ya hiciste.",
  "account.addresses.deleteConfirm.confirm": "Sí, eliminar",
  "account.addresses.deleteConfirm.cancel": "Conservar dirección",
  "account.addresses.deleteConfirm.busy": "Eliminando…",
  "account.addresses.empty": "Todavía no guardas direcciones.",
  "account.addresses.defaultBilling": "Predeterminada de facturación",
  "account.addresses.defaultShipping": "Predeterminada de envío",
  "account.addresses.setDefaultBilling": "Usar para facturación",
  "account.addresses.setDefaultShipping": "Usar para envío",
  "account.addresses.defaultNote":
    "Guardamos una dirección predeterminada de envío y otra de facturación, por eso son dos opciones distintas.",
  "account.addresses.defaultUpdated": "Cambiamos tu dirección predeterminada.",
  "account.addresses.country": "País",

  // --- address form -------------------------------------------------------
  // Field labels map onto the columns a Medusa customer address really has:
  // first_name, last_name, company, address_1, address_2, city, postal_code,
  // province, country_code, phone, address_name. There is no `district` or
  // `region` column, so the Peru concepts are mapped onto `city` and
  // `province` and labelled accordingly.
  "address.field.label": "Nombre de la dirección",
  "address.field.labelHint": "Por ejemplo: Casa, Oficina.",
  "address.field.firstName": "Nombre",
  "address.field.lastName": "Apellidos",
  "address.field.company": "Empresa (opcional)",
  "address.field.address1": "Dirección",
  "address.field.address2": "Referencia (opcional)",
  "address.field.postalCode": "Código postal",
  "address.field.city": "Distrito o ciudad",
  "address.field.province": "Departamento o región",
  "address.field.country": "País",
  "address.field.phone": "Teléfono",
  "address.error.firstName": "Ingresa tu nombre.",
  "address.error.lastName": "Ingresa tus apellidos.",
  "address.error.address1": "Ingresa una dirección.",
  "address.error.city": "Ingresa el distrito o la ciudad.",
  "address.error.postalCode": "Ingresa el código postal.",
  "address.error.country": "Selecciona un país.",
  "address.error.phone": "Ingresa un teléfono válido.",
  "address.error.default": "No pudimos guardar la dirección. Revisa los campos.",

  // --- account: orders list ----------------------------------------------
  "account.orders.orderNumber": "Pedido n.º",
  "account.orders.placedOn": "Fecha",
  "account.orders.itemCount": "{count} artículos",
  "account.orders.itemCountOne": "1 artículo",
  "account.orders.viewDetail": "Ver detalle",
  "account.orders.back": "Volver a mis pedidos",
  "account.orders.paginationLabel": "Paginación de pedidos",
  "account.orders.pageStatus": "Página {page} de {total}",
  "account.orders.previous": "Anterior",
  "account.orders.next": "Siguiente",
  "account.orders.empty.title": "Aún no tienes pedidos.",
  "account.orders.empty.body":
    "Cuando compres algo, aquí verás la fecha, el total y el estado de cada pedido.",
  "account.orders.empty.cta": "Ir a la tienda",
  "account.orders.loadError":
    "No pudimos cargar tus pedidos. Intenta de nuevo en unos minutos.",

  // --- order status -------------------------------------------------------
  // One label per value of the real Medusa 2.21.2 enums. The three concepts
  // stay separate on purpose: an order status, a payment status and a
  // fulfillment status describe different things and are never merged into a
  // single "on its way" label.
  "order.status.fallback": "Estado por confirmar",
  "order.status.order.pending": "Pendiente",
  "order.status.order.completed": "Completado",
  "order.status.order.draft": "Borrador",
  "order.status.order.archived": "Archivado",
  "order.status.order.canceled": "Cancelado",
  "order.status.order.requires_action": "Requiere acción",
  "order.status.payment.not_paid": "Pendiente de pago",
  "order.status.payment.awaiting": "En espera",
  "order.status.payment.authorized": "Autorizado",
  "order.status.payment.partially_authorized": "Parcialmente autorizado",
  "order.status.payment.captured": "Pagado",
  "order.status.payment.partially_captured": "Parcialmente pagado",
  "order.status.payment.partially_refunded": "Parcialmente reembolsado",
  "order.status.payment.refunded": "Reembolsado",
  "order.status.payment.canceled": "Cancelado",
  "order.status.payment.failed": "Falló el pago",
  "order.status.payment.completed": "Cobro completado",
  "order.status.payment.requires_action": "Requiere acción",
  "order.status.fulfillment.not_fulfilled": "Sin preparar",
  "order.status.fulfillment.partially_fulfilled": "Parcialmente preparado",
  "order.status.fulfillment.fulfilled": "Preparado para enviar",
  "order.status.fulfillment.partially_shipped": "Parcialmente enviado",
  "order.status.fulfillment.shipped": "Enviado",
  "order.status.fulfillment.partially_delivered": "Parcialmente entregado",
  "order.status.fulfillment.delivered": "Entregado",
  "order.status.fulfillment.canceled": "Cancelado",

  // --- account: order detail ---------------------------------------------
  "account.order.heading": "Detalle del pedido",
  "account.order.number": "N.º de pedido",
  "account.order.date": "Fecha del pedido",
  "account.order.confirmationEmail": "Correo del pedido",
  "account.order.confirmationEmailNote":
    "La confirmación de la compra se envió a este correo.",
  "account.order.status.order": "Estado del pedido",
  "account.order.status.payment": "Estado del pago",
  "account.order.status.fulfillment": "Estado del envío",
  "account.order.items.title": "Productos",
  "account.order.item.quantity": "Cantidad",
  "account.order.item.variantLabel": "Variante",
  "account.order.item.unitPrice": "Precio unitario",
  "account.order.item.subtotal": "Subtotal",
  "account.order.item.defaultVariant": "Variación estándar",
  "account.order.item.imageAlt": "Imagen de {title}",
  "account.order.item.noImage": "Sin imagen",
  "account.order.totals.title": "Resumen",
  "account.order.totals.subtotal": "Subtotal",
  "account.order.totals.discount": "Descuento",
  "account.order.totals.giftCard": "Tarjeta de regalo",
  "account.order.totals.shipping": "Envío",
  "account.order.totals.taxes": "Impuestos",
  "account.order.totals.total": "Total",
  "account.order.shipping.title": "Dirección de envío",
  "account.order.billing.title": "Dirección de facturación",
  "account.order.contact.title": "Contacto",
  "account.order.shippingMethod.title": "Método de envío",
  "account.order.shippingMethod.none":
    "No registramos método de envío para este pedido.",
  "account.order.address.unknown":
    "No registramos los datos de esta dirección.",
  "account.order.fulfillment.title": "Envío",
  "account.order.fulfillment.none":
    "Todavía no registramos el envío de este pedido.",
  "account.order.fulfillment.shippedAt": "Enviado el",
  "account.order.fulfillment.status": "Estado",
  "account.order.payment.title": "Pago",
  "account.order.payment.none":
    "Todavía no hay información de pago para este pedido.",
  "account.order.payment.developmentProvider": "Transferencia / Yape / Plin (Pago Manual)",
  "account.order.payment.developmentProviderBody":
    "Pedido registrado. El despacho se procesará una vez validado el número de operación o comprobante bancario por nuestro equipo comercial.",
  "account.order.payment.amount": "Monto",
  "account.order.payment.collectionStatus": "Estado de la colección",
  "account.order.notFound.title": "No encontramos ese pedido",
  "account.order.notFound.body":
    "El enlace puede no ser correcto, o ese pedido no pertenece a tu cuenta.",
  "account.order.error.title": "No pudimos abrir ese pedido",

  // --- account: help / footer -------------------------------------------
  // No contact or legal routes exist in this build, so nothing here links to
  // them: a link to a page that 404s is worse than honest copy.
  "account.help.title": "¿Dudas sobre un pedido?",
  "account.help.body":
    "Revisa el detalle del pedido: allí están los estados de pago y envío, los importes y la dirección de entrega.",

  // --- account: auth screens ---------------------------------------------
  "account.login.eyebrow": "Tu cuenta Fancy Pets",
  "account.login.title": "Iniciar sesión",
  "account.login.body":
    "Entra a tu cuenta para ver tus pedidos, tus direcciones y tus datos de contacto.",
  "account.login.field.email": "Correo electrónico",
  "account.login.field.password": "Contraseña",
  "account.login.submit": "Ingresar",
  "account.login.google": "Continuar con Google",
  "account.login.googleLoading": "Conectando con Google…",
  "account.login.orEmail": "o con correo",
  "account.login.notMember": "¿Todavía no tienes cuenta?",
  "account.login.join": "Crear cuenta",
  "account.register.title": "Crear tu cuenta",
  "account.register.body":
    "Regístrate para guardar tus datos y revisar los pedidos que hagas.",
  "account.register.field.firstName": "Nombre",
  "account.register.field.lastName": "Apellidos",
  "account.register.field.email": "Correo electrónico",
  "account.register.field.phone": "Teléfono (opcional)",
  "account.register.field.password": "Contraseña",
  "account.register.submit": "Crear cuenta",
  "account.register.hasAccount": "¿Ya tienes cuenta?",
  "account.register.signIn": "Iniciar sesión",
  "account.register.termsPrefix":
    "Al crear una cuenta aceptas la información legal de la tienda.",
  "account.verify.title": "Verificación de correo",
  "account.verify.body":
    "Esta tienda todavía no envía correos, así que la verificación no está disponible.",
  "account.verify.inProgress": "Verificando tu correo…",
  "account.verify.success": "Tu correo está verificado. Ya puedes iniciar sesión.",
  "account.verify.backToAccount": "Ir a iniciar sesión",
} as const

export type TranslationKey = keyof typeof esPE

/**
 * Translate a key. Development placeholder for an untranslated key is the key
 * itself, which makes missing copy obvious instead of silently rendering "".
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  let value: string = esPE[key]
  if (!value) {
    return key
  }
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replace(`{${name}}`, String(replacement))
    }
  }
  return value
}