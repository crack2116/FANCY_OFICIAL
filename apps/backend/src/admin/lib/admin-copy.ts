/**
 * Every string this customization adds to the Admin, in one place.
 *
 * Medusa's core Admin strings stay untouched and keep coming from the
 * dashboard's own resources. Only the copy THIS project introduces lives here,
 * in Spanish, so a reviewer can read the whole operator-facing surface of the
 * veterinary domain without diffing JSX.
 *
 * A constant table rather than `useTranslation`: the dashboard's i18next
 * resources are keyed by the dashboard's own namespaces, and registering a new
 * namespace just to hold a dozen static labels would couple these screens to a
 * resource-loading path they do not need. Static labels also cannot drift out of
 * sync with a missing key — there is no key to miss.
 */

import type { HeroSlideId } from "./admin-api"

export const ADMIN_COPY = {
  // --- page titles --------------------------------------------------------
  brandingHeading: "Marca y apariencia",
  brandingSubtitle:
    "Estos colores y el logo son los que ve un cliente al entrar a tu tienda. Se aplican sin publicar nada nuevo.",
  brandingSave: "Guardar cambios",
  brandingSaving: "Guardando…",
  brandingSaved: "Marca actualizada. La tienda muestra el cambio en menos de un minuto.",
  brandingLogoHeading: "Logo",
  brandingLogoHint:
    "Dirección web de la imagen. Déjalo vacío para usar el logo oficial de Fancy Pets.",
  brandingLogoPlaceholder: "https://…/logo.png",
  brandingTaglineHeading: "Frase corta",
  brandingTaglineHint: "Aparece junto al logo. Opcional.",
  brandingColorsHeading: "Colores",
  brandFieldPrimary: "Color principal",
  brandFieldPrimaryHint: "Botones, enlaces y el borde del foco.",
  brandFieldPrimaryDark: "Principal oscuro",
  brandFieldPrimaryDarkHint:
    "Se usa cuando el color principal va sobre fondo blanco y necesita más contraste.",
  brandFieldAccent: "Color de acento",
  brandFieldAccentHint: "Ofertas, etiquetas y insignias.",
  brandFieldSurface: "Fondo",
  brandFieldSurfaceHint: "El color de fondo de la página.",
  brandFieldText: "Color del texto",
  brandFieldTextHint: "El color con el que se lee todo el contenido.",
  brandingPreviewHeading: "Vista previa de la tienda",
  brandingPreviewBody:
    "Así ve la página un cliente. Después de guardar, la vista se actualiza sola.",
  brandingPreviewReload: "Actualizar vista",
  brandingPreviewUnavailable:
    "No se pudo cargar la tienda. Revisá que el storefront esté encendido.",
  brandingPreviewOpen: "Abrir la tienda en otra pestaña",
  brandingAnnouncementHeading: "Barra de anuncio",
  brandingAnnouncementEnabled: "Mostrar la barra de anuncio",
  brandingAnnouncementHint:
    "Es la primera franja que ve el cliente, arriba de todo. Máximo 5 mensajes.",
  brandingAnnouncementMessageLabel: "Mensaje",
  brandingAnnouncementAdd: "Agregar mensaje",
  brandingAnnouncementRemove: "Quitar",
  brandingInvalidColor: "Usa un color hexadecimal de 6 dígitos, por ejemplo #F99C32",

  brandingArtworkHeading: "Imágenes de las categorías",
  brandingArtworkHint:
    "Cada categoría de la portada usa su propia imagen. Sube un archivo y aparece en la tienda en menos de un minuto. Si no hay imagen, se usa el dibujo de ejemplo.",
  brandingArtworkUpload: "Subir imagen",
  brandingArtworkUploading: "Subiendo…",
  brandingArtworkClear: "Quitar imagen",
  brandingArtworkCleared: "Se quitó la imagen. Vuelve el dibujo de ejemplo al guardar los cambios.",
  brandingArtworkUploaded: "Imagen guardada. La tienda la muestra en menos de un minuto.",
  brandingArtworkDemoLabel: "Dibujo de ejemplo",
  brandingArtworkEmpty:
    "No se pudieron cargar las categorías, así que no hay imágenes que cambiar.",

  brandingHeroHeading: "Imágenes del banner",
  brandingHeroHint:
    "La imagen grande de arriba del todo. Sirve para phones y computadoras, así que sube una sola por banner. Si no hay imagen, se usa la que ya trae la tienda.",

  brandsMenuLabel: "Marcas",
  brandsHeading: "Marcas",
  brandsSubtitle:
    "Las marcas agrupan productos y aparecen en la tienda con su propia página.",
  brandCreateHeading: "Nueva marca",
  brandEditHeading: "Editar marca",
  brandShowAll: "Ver todas",
  brandCreateAction: "Crear marca",

  // --- list ---------------------------------------------------------------
  brandsEmptyTitle: "Todavía no hay marcas.",
  brandsEmptyDescription:
    "Crea la primera marca para poder asignarla a tus productos y así mostrar su nombre en la tienda.",
  brandsColumnName: "Nombre",
  brandsColumnHandle: "Identificador (URL)",
  brandsColumnStatus: "Estado",
  brandsColumnActions: "Acciones",
  brandsStatusActive: "Activa",
  brandsStatusInactive: "Inactiva",
  brandsSearchLabel: "Buscar marca por nombre",
  brandsSearchPlaceholder: "Buscar marca",
  brandsNoResults: "Ninguna marca coincide con la búsqueda.",
  brandsResultCount: "{count} marcas",
  brandsResultCountOne: "1 marca",

  // --- form ---------------------------------------------------------------
  brandFieldName: "Nombre",
  brandFieldNamePlaceholder: "NutriPet Demo",
  brandFieldNameHint:
    "Es el nombre que verá el comprador en la tarjeta del producto y en su página.",
  brandFieldNameHintGeneric:
    "Ese nombre es muy genérico. Como el filtro de la tienda agrupa por nombre, dos marcas que se llamen igual aparecerían como una sola. Usa el nombre real de la marca.",
  brandFieldNameRequired: "El nombre es obligatorio.",
  brandFieldHandle: "Identificador (URL)",
  brandFieldHandleHint:
    "Parte de la dirección de la página de la marca. Solo minúsculas, números y guiones.",
  brandFieldHandlePlaceholder: "nutripet-demo",
  brandFieldHandleInvalid:
    "Usa solo minúsculas, números y guiones simples, por ejemplo nutripet-demo.",
  brandFieldHandleTaken: "Ese identificador ya lo usa otra marca.",
  brandFieldHandleAuto: "Si lo dejas vacío se genera a partir del nombre.",
  brandFieldDescription: "Descripción",
  brandFieldDescriptionHint:
    "Texto comercial breve. Se muestra en la página de la marca. Máximo 2000 caracteres.",
  brandFieldDescriptionPlaceholder: "Alimento balanceado para perros de todas las edades.",
  brandFieldLogo: "URL del logotipo",
  brandFieldLogoHint:
    "Debe empezar por https:// . Si lo dejas vacío la marca se muestra sin logotipo.",
  brandFieldLogoPlaceholder: "https://…/logo.png",
  brandFieldLogoInvalid: "Ingresa una dirección web completa, por ejemplo https://…",
  brandFieldStatus: "Estado",
  brandFieldStatusHint:
    "Una marca inactiva no se puede asignar a productos ni aparece en la tienda.",
  brandFieldStatusActive: "Activa",
  brandFieldStatusInactive: "Inactiva",

  // --- actions + confirmations -------------------------------------------
  brandActionEdit: "Editar",
  brandActionActivate: "Activar",
  brandActionDeactivate: "Desactivar",
  brandActivateConfirmTitle: "Activar marca",
  brandActivateConfirmBody:
    "La marca volverá a estar disponible para asignarla a productos y volverá a aparecer en la tienda.",
  brandDeactivateConfirmTitle: "Desactivar marca",
  brandDeactivateConfirmBody:
    "La marca dejará de aparecer en la tienda y no podrá asignarse a nuevos productos. Los productos que ya la tienen la conservan, y sus páginas siguen funcionando.",
  brandDeactivateConfirmNote:
    "Desactivar es reversible: puedes volver a activarla cuando quieras.",
  brandCreated: "La marca se creó correctamente.",
  brandUpdated: "Los cambios se guardaron.",
  brandActivated: "La marca está activa.",
  brandDeactivated: "La marca quedó inactiva.",
  brandSave: "Guardar cambios",
  brandSaving: "Guardando…",
  brandCancel: "Cancelar",
  brandSavingBlocked: "Corrige los campos marcados antes de guardar.",

  // --- product widget: brand ---------------------------------------------
  productBrandHeading: "Marca",
  productBrandEmpty: "Este producto no tiene marca asignada.",
  productBrandEmptyHint:
    "Asigna una para que su nombre aparezca en la tienda y en la página del producto.",
  productBrandSelectLabel: "Marca del producto",
  productBrandSelectEmpty: "Selecciona una marca",
  productBrandSave: "Guardar marca",
  productBrandRemoving: "Quitando…",
  productBrandRemoveAction: "Quitar marca",
  productBrandRemoveConfirmTitle: "Quitar la marca del producto",
  productBrandRemoveConfirmBody:
    "El producto dejará de mostrarse bajo esa marca. La marca seguirá existiendo y los demás productos no cambian.",
  productBrandAssigned: "La marca quedó asignada.",
  productBrandRemoved: "Se quitó la marca del producto.",
  productBrandUnavailable: "La marca seleccionada ya no está disponible.",

  // --- product widget: pet data -------------------------------------------
  petDataHeading: "Datos de mascota",
  petDataHint:
    "Información comercial del producto: para qué especie es, en qué etapa de vida y para qué tamaño. No es un diagnóstico veterinario.",
  petDataEmpty: "Este producto no tiene datos de mascota.",
  petDataEmptyHint:
    "Guárdalos para que el comprador pueda filtrar por especie, etapa de vida y tamaño.",
  petDataFieldSpecies: "Especie",
  petDataFieldSpeciesHint:
    "Marca al menos una. Elige todas las especies para las que el producto es válido.",
  petDataSpeciesRequired: "Selecciona al menos una especie.",
  petDataFieldLifeStage: "Etapa de vida",
  petDataFieldPetSize: "Tamaño recomendado",
  petDataSave: "Guardar datos",
  petDataRemoving: "Quitando…",
  petDataRemoveAction: "Quitar datos de mascota",
  petDataRemoveConfirmTitle: "Quitar los datos de mascota",
  petDataRemoveConfirmBody:
    "El producto dejará de mostrarse con especie, etapa de vida y tamaño. Volverán a ser filtros vacíos en la tienda.",
  petDataSaved: "Los datos de mascota se guardaron.",
  petDataRemoved: "Se quitaron los datos de mascota.",
  petDataUnknownValue:
    "El producto tiene un valor que esta versión no reconoce. Vuelve a guardarlo para corregirlo.",
  petDataUnavailable: "La especie seleccionada ya no está disponible.",

  // --- shared -------------------------------------------------------------
  loading: "Cargando…",
  retry: "Reintentar",
  unknownSpecies: "Especie sin nombre",
  loadErrorTitle: "No pudimos cargar la información.",
  saveErrorTitle: "No pudimos guardar los cambios.",
} as const

export type AdminCopyKey = keyof typeof ADMIN_COPY

/**
 * Hero slide labels, keyed by the slide id from `HERO_SLIDE_IDS`
 * (`./admin-api`).
 *
 * A separate export rather than an `ADMIN_COPY` entry because that table is
 * `string`-valued: `copy()` interpolates placeholders into a string, and a
 * record has no placeholders. The split mirrors the split of responsibility
 * elsewhere in this file — the ids belong to the wire contract, the words belong
 * to the copy this app owns.
 *
 * Typed against `Record<HeroSlideId, string>` so adding a slide to the contract
 * without naming it here is a compile error rather than a blank label.
 */
export const HERO_SLIDE_LABELS: Record<HeroSlideId, string> = {
  "cuidado-diario": "Cuidado diario",
  "bienestar-diario": "Bienestar diario",
}

/**
 * Fill `{placeholders}` in a label. Kept tiny and total on purpose: a missing
 * placeholder is a bug in the call site, not something to surface to the
 * operator, so the raw template is returned unchanged.
 */
export function copy(key: AdminCopyKey, vars?: Record<string, string | number>): string {
  const template = ADMIN_COPY[key]
  let value: string = template

  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replace(`{${name}}`, String(replacement))
    }
  }

  return value
}