import { describe, expect, it } from 'vitest'
import {
  arcToCubics,
  cubicBounds,
  cubicDerivative,
  cubicLength,
  cubicPoint,
  flattenCubic,
  quadraticBounds,
  quadraticDerivative,
  quadraticPoint,
  quadraticToCubic,
  splitCubic
} from '../../../src/core/geometry/bezier'
import { distance, vec } from '../../../src/core/geometry/vec'

describe('quadratiques', () => {
  it('évalue aux bornes 0 et 1', () => {
    const a = vec(0, 0)
    const b = vec(10, 20)
    const c = vec(30, -5)
    expect(quadraticPoint(a, b, c, 0)).toEqual(a)
    expect(quadraticPoint(a, b, c, 1)).toEqual(c)
  })

  it('passe exactement par son point de contrôle en t=0.5 quand P0 et P2 sont symétriques', () => {
    const p = quadraticPoint(vec(0, 0), vec(0, 20), vec(0, 40), 0.5)
    expect(p.y).toBeCloseTo(20, 8)
  })

  it('dérive correctement une droite', () => {
    const d = quadraticDerivative(vec(0, 0), vec(5, 0), vec(10, 0), 0.3)
    expect(d.x).toBeCloseTo(10, 6)
    expect(d.y).toBe(0)
  })

  it('bornes : quadratique simple', () => {
    const { min, max } = quadraticBounds(vec(0, 0), vec(0, 10), vec(0, 20))
    expect(min).toEqual({ x: 0, y: 0 })
    expect(max).toEqual({ x: 0, y: 20 })
  })

  it('bornes : contrôle dépassant les extrémités (apex calculé)', () => {
    const { min, max } = quadraticBounds(vec(0, 0), vec(10, 20), vec(20, 0))
    expect(max.y).toBeCloseTo(10, 5)
    expect(max.y).toBeLessThanOrEqual(20)
    expect(min.y).toBe(0)
    expect(min.x).toBe(0)
    expect(max.x).toBe(20)
  })

  it('convertit une quadratique en cubique équivalente', () => {
    const cubic = quadraticToCubic(vec(0, 0), vec(10, 10), vec(20, 0))
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(distance(cubicPoint(cubic[0]!, cubic[1]!, cubic[2]!, cubic[3]!, t), quadraticPoint(vec(0, 0), vec(10, 10), vec(20, 0), t))).toBeCloseTo(0, 6)
    }
  })
})

describe('cubiques', () => {
  it('évalue aux bornes 0 et 1', () => {
    const a = vec(0, 0)
    const b = vec(10, 0)
    const c = vec(20, 0)
    const d = vec(30, 0)
    expect(cubicPoint(a, b, c, d, 0)).toEqual(a)
    expect(cubicPoint(a, b, c, d, 1)).toEqual(d)
  })

  it('est linéaire quand tous les points sont sur la même droite', () => {
    const a = vec(0, 0)
    const d = vec(10, 0)
    const p = cubicPoint(a, { x: 3, y: 0 }, { x: 7, y: 0 }, d, 0.5)
    expect(p.x).toBeCloseTo(5, 8)
    expect(p.y).toBe(0)
  })

  it('dérivée : point de départ et d\'arrivée', () => {
    const a = vec(0, 0)
    const b = vec(0, 10)
    const c = vec(0, 10)
    const d = vec(0, 20)
    const d0 = cubicDerivative(a, b, c, d, 0)
    expect(d0.x).toBe(0)
    expect(d0.y).toBeCloseTo(30, 6)
  })

  it('splitCubic : recouvre la courbe d\'origine', () => {
    const a = vec(0, 0)
    const b = vec(10, 30)
    const c = vec(20, -10)
    const d = vec(30, 0)
    const t = 0.4
    const { left, right } = splitCubic(a, b, c, d, t)
    expect(left[0]).toEqual(a)
    expect(left[3]).toEqual(right[0])
    expect(right![3]).toEqual(d)
    for (const u of [0, 0.25, 0.5, 1]) {
      const lp = cubicPoint(left[0]!, left[1]!, left[2]!, left[3]!, u)
      expect(distance(lp, cubicPoint(a, b, c, d, t * u))).toBeCloseTo(0, 6)
      const rp = cubicPoint(right[0]!, right[1]!, right[2]!, right[3]!, u)
      expect(distance(rp, cubicPoint(a, b, c, d, t + (1 - t) * u))).toBeCloseTo(0, 6)
    }
  })

  it('flattenCubic : polyline dont les extrémités sont conservées et la courbe approchée', () => {
    const a = vec(0, 0)
    const d = vec(100, 0)
    const poly = flattenCubic(a, vec(0, 50), vec(100, 50), d, 0.25)
    expect(poly[0]).toEqual(a)
    expect(poly.at(-1)).toEqual(d)
    expect(poly.length).toBeGreaterThan(2)
    const maxDeviation = Math.max(...poly.map((p) => Math.abs(p.y)))
    expect(maxDeviation).toBeLessThanOrEqual(50 + 0.5)
  })

  it('bornes : couvre la courbe et le polygone de contrôle', () => {
    const a = vec(0, 0)
    const b = vec(0, 100)
    const c = vec(100, 100)
    const d = vec(100, 0)
    const { min, max } = cubicBounds(a, b, c, d)
    expect(min.x).toBe(0)
    expect(min.y).toBeGreaterThanOrEqual(0)
    expect(max.x).toBe(100)
    expect(max.y).toBeCloseTo(75, 3)
  })

  it('longueur : cohérente avec un segment droit', () => {
    const len = cubicLength(vec(0, 0), vec(0, 10), vec(0, 100), vec(0, 300), 0.5)
    expect(Math.abs(len - 300)).toBeLessThan(30)
  })

  it('bornes d\'une cubique dégénérée (droite) : extrêmes aux extrémités', () => {
    const { min, max } = cubicBounds(vec(-5, 0), vec(-3, 0), vec(2, 0), vec(7, 0))
    expect(min.x).toBe(-5)
    expect(max.x).toBe(7)
    expect(min.y).toBe(0)
    expect(max.y).toBe(0)
  })
})

describe('arcToCubics (arcs SVG)', () => {
  it('retourne [] pour un arc dégénéré (mêmes points)', () => {
    const cubics = arcToCubics({ start: vec(10, 10), end: vec(10, 10), radius: { rx: 5, ry: 5 }, rotationDegrees: 0, largeArc: false, sweep: true })
    expect(cubics).toEqual([])
  })

  it('retourne [] pour des rayons nuls', () => {
    const cubics = arcToCubics({ start: vec(0, 0), end: vec(10, 10), radius: { rx: 0, ry: 5 }, rotationDegrees: 0, largeArc: false, sweep: true })
    expect(cubics).toEqual([])
  })

  it('produit un demi-cercle supérieur (sweep=false) exactement borné', () => {
    const cubics = arcToCubics({ start: vec(-10, 0), end: vec(10, 0), radius: { rx: 10, ry: 10 }, rotationDegrees: 0, largeArc: false, sweep: false })
    expect(cubics.length).toBe(2)
    expect(cubics.at(-1)![3]).toEqual({ x: 10, y: 0 })
    const start = cubics[0]![0]
    expect(distance(start, vec(-10, 0))).toBeCloseTo(0, 6)
    const maxY = Math.max(...cubics.map((seg) => seg[3]).map((p) => p.y))
    expect(Math.abs(maxY - 10)).toBeLessThan(0.01)
    const midY = Math.max(...cubics.map((seg) => seg[2]).map((p) => p.y))
    expect(Math.abs(midY - 10)).toBeLessThan(0.01)
  })

  it('arc dégénéré (start = end) : aucun segment', () => {
    const cubics = arcToCubics({ start: vec(10, 0), end: vec(10, 0), radius: { rx: 10, ry: 10 }, rotationDegrees: 0, largeArc: false, sweep: true })
    expect(cubics).toEqual([])
  })

  it('arc de 90° : un seul segment et approximation proche du quart de cercle', () => {
    const cubics = arcToCubics({ start: vec(10, 0), end: vec(0, 10), radius: { rx: 10, ry: 10 }, rotationDegrees: 0, largeArc: false, sweep: true })
    expect(cubics.length).toBe(1)
    const mid = cubicPoint(cubics[0]![0]!, cubics[0]![1]!, cubics[0]![2]!, cubics[0]![3]!, 0.5)
    // Distance au centre (0,0) ≈ 10 (arc de cercle)
    expect(distance(mid, vec(0, 0))).toBeCloseTo(10, 2)
  })
})