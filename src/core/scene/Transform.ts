import type { Vec2 } from '../geometry/vec'

export interface Transform {
  m00: number
  m01: number
  m02: number
  m10: number
  m11: number
  m12: number
}

export function identityTransform(): Transform {
  return { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
}

export function translation(x: number, y: number): Transform {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y }
}

export function scaling(sx: number, sy = sx): Transform {
  return { m00: sx, m01: 0, m02: 0, m10: 0, m11: sy, m12: 0 }
}

export function compose(a: Transform, b: Transform): Transform {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12
  }
}

export function applyTransform(t: Transform, x: number, y: number): Vec2 {
  return {
    x: t.m00 * x + t.m01 * y + t.m02,
    y: t.m10 * x + t.m11 * y + t.m12
  }
}

/**
 * Inverse d'une transformation affine 2×3. Retourne null si la matrice est
 * singulière (échelle nulle). Utilisée pour ramener un point monde en espace
 * local d'un nœud lors du hit-testing.
 */
export function inverseTransform(t: Transform): Transform | null {
  const det = t.m00 * t.m11 - t.m01 * t.m10
  if (Math.abs(det) < 1e-9) return null
  const inv = 1 / det
  return {
    m00: t.m11 * inv,
    m01: -t.m01 * inv,
    m02: (t.m01 * t.m12 - t.m11 * t.m02) * inv,
    m10: -t.m10 * inv,
    m11: t.m00 * inv,
    m12: (t.m10 * t.m02 - t.m00 * t.m12) * inv
  }
}

export function isIdentity(t: Transform): boolean {
  return (
    t.m00 === 1 &&
    t.m01 === 0 &&
    t.m02 === 0 &&
    t.m10 === 0 &&
    t.m11 === 1 &&
    t.m12 === 0
  )
}