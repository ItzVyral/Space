import { describe, expect, it } from 'vitest'
import {
  applyTransform,
  compose,
  identityTransform,
  isIdentity,
  scaling,
  translation
} from '../../../src/core/scene/Transform'

describe('Transform', () => {
  it('fournit une identité et la détecte', () => {
    expect(isIdentity(identityTransform())).toBe(true)
    expect(isIdentity(translation(1, 0))).toBe(false)
  })

  it('applique une translation', () => {
    const t = translation(5, -3)
    expect(applyTransform(t, 1, 2)).toEqual({ x: 6, y: -1 })
  })

  it('applique une mise à l\'échelle', () => {
    const t = scaling(2, 3)
    expect(applyTransform(t, 4, 5)).toEqual({ x: 8, y: 15 })
  })

  it('compose les transforms dans le bon ordre (b puis a)', () => {
    const t = compose(translation(10, 0), scaling(2))
    expect(applyTransform(t, 1, 1)).toEqual({ x: 12, y: 2 })
  })

  it('composer avec l\'identité est un no-op', () => {
    const t = translation(4, 4)
    expect(compose(t, identityTransform())).toEqual(t)
    expect(compose(identityTransform(), t)).toEqual(t)
  })
})