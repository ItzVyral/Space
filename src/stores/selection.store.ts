import { get, writable } from 'svelte/store'

export const selection = writable<ReadonlySet<string>>(new Set())

export function clearSelection(): void {
  selection.set(new Set())
}

export function selectOnly(ids: readonly string[]): void {
  selection.set(new Set(ids))
}

export function addToSelection(ids: readonly string[]): void {
  selection.update((current) => {
    const next = new Set(current)
    for (const id of ids) next.add(id)
    return next
  })
}

export function toggleInSelection(id: string): boolean {
  const current = get(selection)
  const next = new Set(current)
  const nowSelected = !next.has(id)
  if (nowSelected) next.add(id)
  else next.delete(id)
  selection.set(next)
  return nowSelected
}
