import { describe, expect, it } from 'vitest'
import {
  defaultViewport,
  MAX_ZOOM,
  MIN_ZOOM,
  screenToWorld,
  worldToScreen,
  zoomAt
} from '../../../src/core/viewport/Viewport'

describe('Viewport', () => {
  it('fournit une vue par défaut à l\'identité', () => {
    expect(defaultViewport()).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('conserve le point sous le curseur après un zoom (round-trip)', () => {
    const v = { x: -40, y: 30, zoom: 2 }
    const sx = 120
    const sy = 75
    const world = screenToWorld(v, sx, sy)
    const zoomed = zoomAt(v, sx, sy, 1.5)
    expect(zoomed.zoom).toBeCloseTo(3)
    expect(screenToWorld(zoomed, sx, sy)).toEqual(world)
  })

  it('plafonne le zoom entre MIN_ZOOM et MAX_ZOOM', () => {
    const v = defaultViewport()
    expect(zoomAt(v, 0, 0, 1e-9).zoom).toBe(MIN_ZOOM)
    expect(zoomAt(v, 0, 0, 1e9).zoom).toBe(MAX_ZOOM)
  })

  it('worldToScreen puis screenToWorld sont inverses l\'un de l\'autre', () => {
    const v = { x: 13, y: -7, zoom: 4 }
    const screen = worldToScreen(v, 5, 9)
    expect(screenToWorld(v, screen.x, screen.y)).toEqual({ x: 5, y: 9 })
  })

  it('un viewport identité laisse les coordonnées inchangées', () => {
    expect(worldToScreen(defaultViewport(), 3, 4)).toEqual({ x: 3, y: 4 })
    expect(screenToWorld(defaultViewport(), 3, 4)).toEqual({ x: 3, y: 4 })
  })
})