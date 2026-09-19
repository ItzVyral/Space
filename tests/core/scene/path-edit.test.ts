import { describe, expect, it } from 'vitest'
import {
  insertAnchorPoint,
  moveAnchorPoint,
  removeAnchorPoint,
  setAnchorType
} from '../../../src/core/scene/path-edit'
import type { AnchorPoint } from '../../../src/core/scene/SceneNode'

function square(): AnchorPoint[] {
  return [
    { position: { x: 0, y: 0 }, handleIn: null, handleOut: null, type: 'corner' },
    { position: { x: 10, y: 0 }, handleIn: null, handleOut: null, type: 'corner' },
    { position: { x: 10, y: 10 }, handleIn: null, handleOut: null, type: 'corner' },
    { position: { x: 0, y: 10 }, handleIn: null, handleOut: null, type: 'corner' }
  ]
}

describe('moveAnchorPoint', () => {
  it('déplace l\'ancre et préserve les autres', () => {
    const points = square()
    const moved = moveAnchorPoint(points, 0, { x: 5, y: -2 })
    expect(moved[0]!.position).toEqual({ x: 5, y: -2 })
    expect(moved[1]!.position).toEqual({ x: 10, y: 0 })
    expect(moved[3]!.position).toEqual({ x: 0, y: 10 })
    // L'entrée d'origine n'est pas mutée.
    expect(points[0]!.position).toEqual({ x: 0, y: 0 })
  })

  it('indice hors bornes : retour du tableau inchangé', () => {
    const points = square()
    expect(moveAnchorPoint(points, 99, { x: 1, y: 1 })).toBe(points)
  })
})

describe('insertAnchorPoint', () => {
  it('insère une ancre de coin après l\'indice cible', () => {
    const points = insertAnchorPoint(square(), 0, { x: 5, y: 0 })
    expect(points).toHaveLength(5)
    expect(points[1]).toEqual({ position: { x: 5, y: 0 }, handleIn: null, handleOut: null, type: 'corner' })
    expect(points[2]!.position).toEqual({ x: 10, y: 0 })
  })

  it('clamp aux extrémités : -1 insère en tête, dernier insère en queue', () => {
    const head = insertAnchorPoint(square(), -1, { x: -5, y: 0 })
    expect(head[0]!.position).toEqual({ x: -5, y: 0 })
    const tail = insertAnchorPoint(square(), 3, { x: 9, y: 5 })
    expect(tail[4]!.position).toEqual({ x: 9, y: 5 })
  })
})

describe('removeAnchorPoint', () => {
  it('supprime l\'ancre ciblée', () => {
    const points = removeAnchorPoint(square(), 1)
    expect(points).toHaveLength(3)
    expect(points.map((p) => p.position)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ])
  })

  it('refusé tant que le chemin garde moins de 2 points', () => {
    const deux = [square()[0]!, square()[1]!]
    expect(removeAnchorPoint(deux, 0)).toBe(deux)
  })

  it('indice hors bornes : tableau inchangé', () => {
    const points = square()
    expect(removeAnchorPoint(points, 9)).toBe(points)
  })
})

describe('setAnchorType', () => {
  it('corner vide les poignées', () => {
    const smooth: AnchorPoint[] = [
      {
        position: { x: 0, y: 0 },
        handleIn: { x: -10, y: 0 },
        handleOut: { x: 10, y: 0 },
        type: 'symmetric'
      }
    ]
    const cornered = setAnchorType(smooth, 0, 'corner')
    expect(cornered[0]!.type).toBe('corner')
    expect(cornered[0]!.handleIn).toBeNull()
    expect(cornered[0]!.handleOut).toBeNull()
  })

  it('smooth miroir via la seule poignée existante', () => {
    const single: AnchorPoint[] = [
      { position: { x: 0, y: 0 }, handleIn: { x: -10, y: 0 }, handleOut: null, type: 'corner' }
    ]
    const smooth = setAnchorType(single, 0, 'smooth')
    expect(smooth[0]!.handleIn).toEqual({ x: -10, y: 0 })
    expect(smooth[0]!.handleOut).toEqual({ x: 10, y: 0 })
  })

  it('symmetric égalise la longueur des deux poignées', () => {
    const asym: AnchorPoint[] = [
      {
        position: { x: 0, y: 0 },
        handleIn: { x: -10, y: 0 },
        handleOut: { x: 4, y: 0 },
        type: 'corner'
      }
    ]
    const sym = setAnchorType(asym, 0, 'symmetric')
    expect(sym[0]!.type).toBe('symmetric')
    expect(sym[0]!.handleIn).toEqual({ x: -7, y: 0 })
    expect(sym[0]!.handleOut).toEqual({ x: 7, y: 0 })
  })

  it('même type : tableau inchangé', () => {
    const points = square()
    expect(setAnchorType(points, 0, 'corner')).toBe(points)
  })
})