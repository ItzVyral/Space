import { writable } from 'svelte/store'

export interface WorldRect {
  x: number
  y: number
  w: number
  h: number
}

export interface DrawPreview {
  type: 'rect' | 'ellipse'
  rect: WorldRect
}

export const marquee = writable<WorldRect | null>(null)

export const drawPreview = writable<DrawPreview | null>(null)

export function clearInteractionPreview(): void {
  marquee.set(null)
  drawPreview.set(null)
}
