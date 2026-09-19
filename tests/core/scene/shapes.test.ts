import { describe, expect, it } from 'vitest'
import { createEllipseNode, createRectNode } from '../../../src/core/scene/SceneNode'
import { ellipseToPath, rectToPath } from '../../../src/core/scene/shapes'

describe('rectToPath', () => {
  it('produit un chemin fermé de 4 ancres de coin, sens horaire', () => {
    const rect = createRectNode('r', { width: 100, height: 40 })
    const path = rectToPath(rect)
    expect(path.type).toBe('path')
    expect(path.closed).toBe(true)
    expect(path.id).toBe('r')
    expect(path.points).toHaveLength(4)
    expect(path.points.map((p) => p.position)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 },
      { x: 0, y: 40 }
    ])
    for (const anchor of path.points) {
      expect(anchor.type).toBe('corner')
      expect(anchor.handleIn).toBeNull()
      expect(anchor.handleOut).toBeNull()
    }
  })
})

describe('ellipseToPath', () => {
  it('produit 4 ancres cardinales à poignées symétriques', () => {
    const ellipse = createEllipseNode('e', { width: 200, height: 100 })
    const path = ellipseToPath(ellipse)
    expect(path.closed).toBe(true)
    expect(path.id).toBe('e')
    expect(path.points).toHaveLength(4)
    expect(path.points[0]!.position).toEqual({ x: 100, y: 0 })
    expect(path.points[1]!.position).toEqual({ x: 200, y: 50 })
    expect(path.points[2]!.position).toEqual({ x: 100, y: 100 })
    expect(path.points[3]!.position).toEqual({ x: 0, y: 50 })
  })

  it('les poignées ont la longueur κ·rayon dans l\'axe tangentiel', () => {
    const ellipse = createEllipseNode('e', { width: 200, height: 100 })
    const path = ellipseToPath(ellipse)
    const k = 0.5522847498307936
    // Ancre droite (200,50) : poignées verticales, longueur κ·ry = κ·50
    const right = path.points[1]!
    expect(right.handleIn).toEqual({ x: 200, y: 50 - k * 50 })
    expect(right.handleOut).toEqual({ x: 200, y: 50 + k * 50 })
    // Ancre haute (100,0) : poignées horizontales, longueur κ·rx = κ·100
    const top = path.points[0]!
    expect(top.handleIn).toEqual({ x: 100 - k * 100, y: 0 })
    expect(top.handleOut).toEqual({ x: 100 + k * 100, y: 0 })
  })
})