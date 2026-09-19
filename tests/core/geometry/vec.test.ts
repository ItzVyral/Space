import { describe, expect, it } from 'vitest'
import { add, distance, length, scale, sub, vec } from '../../../src/core/geometry/vec'

describe('vec', () => {
  it('crée un vecteur avec des valeurs par défaut à zéro', () => {
    expect(vec()).toEqual({ x: 0, y: 0 })
    expect(vec(3, -2)).toEqual({ x: 3, y: -2 })
  })

  it('additionne et soustrait deux vecteurs', () => {
    expect(add(vec(1, 2), vec(3, 4))).toEqual({ x: 4, y: 6 })
    expect(sub(vec(5, 7), vec(2, 3))).toEqual({ x: 3, y: 4 })
  })

  it('met à l\'échelle un vecteur', () => {
    expect(scale(vec(2, -3), 2)).toEqual({ x: 4, y: -6 })
  })

  it('calcule longueur et distance (cas triviaux)', () => {
    expect(length(vec(3, 4))).toBe(5)
    expect(length(vec(0, 0))).toBe(0)
    expect(distance(vec(0, 0), vec(3, 4))).toBe(5)
    expect(distance(vec(1, 1), vec(1, 1))).toBe(0)
  })
})