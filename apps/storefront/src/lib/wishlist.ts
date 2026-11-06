/**
 * Local wishlist — one key, one array of product handles, this browser only.
 *
 * THERE IS NO SERVER BEHIND THIS, AND THE COPY MUST NEVER SAY OTHERWISE. A
 * server-side wishlist was explicitly declined; this is `localStorage` on the
 * visitor's own device. Nothing here touches an account, so no screen may
 * promise a list that follows them to another phone.
 *
 * WHY HANDLES AND NOT IDS
 * A handle is the same string the product URL already carries, so the stored
 * value survives a catalogue re-seed that changes primary keys and can be
 * pasted back into `/products/<handle>` by hand.
 *
 * WHY A MODULE STORE AND NOT A CONTEXT
 * One product can be on the page twice at once — a rail and `/store`, a category
 * page and its related block — and every heart for it has to agree. A context
 * would have to wrap every route that renders a card. Module state is reachable
 * from any card without a provider, and `useSyncExternalStore` hands every
 * subscriber the same snapshot.
 *
 * NOTHING IN HERE THROWS
 * `localStorage` does not exist on the server, throws on ACCESS in Safari
 * private mode and on locked-down iframes, and throws on WRITE once the quota
 * is gone. Every access is guarded, so a shopper in private mode gets a wishlist
 * that works for the visit and simply does not survive a reload — instead of a
 * component that fails to render.
 */

/**
 * The one key. Namespaced so it can never collide with anything else the
 * storefront keeps on the origin.
 */
const WISHLIST_KEY = "fancy-pets:wishlist"

/**
 * The server snapshot, and the value the store starts from on the client.
 *
 * One frozen constant for the whole render pass, because `useSyncExternalStore`
 * compares snapshots by identity: a fresh `[]` on every call is an infinite
 * render loop, and a value read from storage during render is a hydration
 * mismatch. Sharing this constant is what makes both problems go away.
 */
const EMPTY: readonly string[] = []

/** The last value handed to a subscriber. Replaced, never mutated in place. */
let snapshot: readonly string[] = EMPTY

/** One read per document. Hydrating again would fight an in-flight toggle. */
let hydrated = false

const listeners = new Set<() => void>()

/**
 * `window.localStorage`, or null when there is no window or the browser refuses
 * the property itself — which private mode does, on ACCESS rather than on
 * write, so the `typeof window` guard alone is not enough.
 */
function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Parse a stored value defensively.
 *
 * Anything that is not an array of non-empty strings is treated as an empty
 * wishlist: a hand-edited or truncated value is indistinguishable from an empty
 * one from the shopper's side, and a crashed render over a corrupt key is far
 * worse than losing a list nobody can see anyway.
 */
function parse(raw: string | null): string[] {
  if (!raw) {
    return []
  }

  try {
    const stored: unknown = JSON.parse(raw)

    if (!Array.isArray(stored)) {
      return []
    }

    const handles = stored.filter(
      (item): item is string => typeof item === "string" && item.length > 0
    )

    /* Duplicates would make the button flicker between two identical values and
       grow the array on every tap, and nothing can add one twice — but a
       hand-edited key can. */
    return Array.from(new Set(handles))
  } catch {
    return []
  }
}

function readStored(): string[] {
  const store = storage()

  if (!store) {
    return []
  }

  try {
    return parse(store.getItem(WISHLIST_KEY))
  } catch {
    return []
  }
}

function notify(): void {
  /* `Array.from` rather than spreading or `for..of`: the tsconfig targets es5
     without `downlevelIteration`, so iterating a Set directly is a compile
     error. A subscriber may also unsubscribe during notification — a component
     unmounting from a wishlist update — so the set is snapshotted first. */
  for (const listener of Array.from(listeners)) {
    listener()
  }
}

/**
 * Read `localStorage` once and publish it.
 *
 * Called from an effect by every heart, and only the first call does any work.
 * Going through an effect rather than reading during render is deliberate: the
 * server has no storage, so the first client render MUST see the same empty
 * default the server rendered, or React reports a hydration mismatch.
 */
export function hydrateWishlist(): void {
  if (hydrated || typeof window === "undefined") {
    return
  }

  hydrated = true
  snapshot = readStored()

  /*
   * Cross-tab sync. The `storage` event fires in every OTHER tab and never in
   * the one that wrote — `toggleWishlist` covers that half with `notify()`, and
   * this covers the rest. A null key means the whole origin was cleared, which
   * has to empty the list too.
   *
   * The listener is never removed because the store never is: both live for as
   * long as the document, and there is no unmount that should forget a wishlist.
   */
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== WISHLIST_KEY) {
      return
    }

    snapshot = readStored()
    notify()
  })

  notify()
}

/** Register a subscriber. Returns its own unsubscribe, for the effect cleanup. */
export function subscribeWishlist(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/**
 * The live snapshot. Every card on the page calls this and gets the SAME array
 * identity until something actually changes, which is the property
 * `useSyncExternalStore` needs to avoid re-rendering on every scroll.
 */
export function getWishlistSnapshot(): readonly string[] {
  return snapshot
}

/** What the server rendered, and therefore what hydration must agree with. */
export function getWishlistServerSnapshot(): readonly string[] {
  return EMPTY
}

/**
 * Add or remove a handle, and tell every other heart about it.
 *
 * A fresh array is built on both branches — `filter` and spread both allocate —
 * so the identity changes on every toggle and no subscriber is left thinking
 * nothing happened.
 */
export function toggleWishlist(handle: string): void {
  if (!handle) {
    return
  }

  const next = snapshot.includes(handle)
    ? snapshot.filter((item) => item !== handle)
    : [...snapshot, handle]

  const store = storage()

  if (store) {
    try {
      store.setItem(WISHLIST_KEY, JSON.stringify(next))
    } catch {
      /* Quota exhausted, or private mode refusing the write. The in-memory list
         below still updates, so the heart keeps working for this visit and only
         persistence across reloads is lost. A heart that silently refuses to
         respond would be the worse failure. */
    }
  }

  snapshot = next
  notify()
}
