import { writable } from 'svelte/store'

export type View = 'home' | 'editor'

export const view = writable<View>('home')

export function goHome(): void {
  view.set('home')
}

export function goEditor(): void {
  view.set('editor')
}