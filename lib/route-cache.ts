/**
 * Client-side dirty-flag registry for Next.js route cache management.
 *
 * When a mutation happens on a route, mark it dirty. When the user navigates
 * back to that route, the Nav hook detects the flag and calls router.refresh()
 * before clearing it — guaranteeing fresh data without relying solely on a
 * time-based stale window.
 *
 * This is a plain module (not React state) so the flag survives React re-renders
 * and cross-component boundaries. It resets on a full page reload, which is fine
 * because a hard reload always fetches fresh data anyway.
 */

const dirty = new Set<string>()

export function markDirty(route: string): void {
  dirty.add(route)
}

export function isDirty(route: string): boolean {
  return dirty.has(route)
}

export function clearDirty(route: string): void {
  dirty.delete(route)
}
