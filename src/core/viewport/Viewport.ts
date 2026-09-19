export interface Viewport {
  x: number
  y: number
  zoom: number
}

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 64

export function defaultViewport(): Viewport {
  return { x: 0, y: 0, zoom: 1 }
}

export function worldToScreen(v: Viewport, wx: number, wy: number): { x: number; y: number } {
  return { x: v.x + wx * v.zoom, y: v.y + wy * v.zoom }
}

export function screenToWorld(v: Viewport, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - v.x) / v.zoom, y: (sy - v.y) / v.zoom }
}

export function zoomAt(v: Viewport, sx: number, sy: number, factor: number): Viewport {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor))
  const ratio = v.zoom === 0 ? 1 : zoom / v.zoom
  return {
    x: sx - (sx - v.x) * ratio,
    y: sy - (sy - v.y) * ratio,
    zoom
  }
}