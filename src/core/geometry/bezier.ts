/**
 * Mathématiques des courbes de Bézier (quadratique et cubique), pures et
 * testables. Servent au hit-testing, aux bornes exactes, au rendu aplati et
 * à la conversion d'arcs SVG (voir svg-import).
 */
import { distance, distToSegment, lerp, type Vec2 } from './vec'

export type Cubic = [Vec2, Vec2, Vec2, Vec2]

const DEG_TO_RAD = Math.PI / 180

export function quadraticPoint(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const a = lerp(p0, p1, t)
  const b = lerp(p1, p2, t)
  return lerp(a, b, t)
}

export function quadraticDerivative(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const a = lerp(p0, p1, t)
  const b = lerp(p1, p2, t)
  return { x: (b.x - a.x) * 2, y: (b.y - a.y) * 2 }
}

/**
 * Subdivision de de Casteljau : les quatre points de contrôle gauche et les
 * quatre points de contrôle droit de la courbe en `t`.
 */
export function splitCubic(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): { left: Cubic; right: Cubic } {
  const e0 = lerp(p0, p1, t)
  const e1 = lerp(p1, p2, t)
  const e2 = lerp(p2, p3, t)
  const f0 = lerp(e0, e1, t)
  const f1 = lerp(e1, e2, t)
  const g = lerp(f0, f1, t)
  return { left: [p0, e0, f0, g], right: [g, f1, e2, p3] }
}

export function cubicPoint(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const left = lerp(p0, p1, t)
  const mid = lerp(p1, p2, t)
  const right = lerp(p2, p3, t)
  const a = lerp(left, mid, t)
  const b = lerp(mid, right, t)
  return lerp(a, b, t)
}

/**
 * Dérivée d'une cubique : interpolée par la quadratique de contrôle
 * `3(P1-P0), 3(P2-P1), 3(P3-P2)`.
 */
export function cubicDerivative(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const d0 = { x: (p1.x - p0.x) * 3, y: (p1.y - p0.y) * 3 }
  const d1 = { x: (p2.x - p1.x) * 3, y: (p2.y - p1.y) * 3 }
  const d2 = { x: (p3.x - p2.x) * 3, y: (p3.y - p2.y) * 3 }
  return quadraticPoint(d0, d1, d2, t)
}

function quadraticRoots(p0: number, p1: number, p2: number): number[] {
  const a = p0 - 2 * p1 + p2
  if (Math.abs(a) < 1e-9) {
    return []
  }
  const root = (p0 - p1) / a
  return [root]
}

/** Bornes exactes d'une quadratique (toutes composantes, extrêmes inclus). */
export function quadraticBounds(p0: Vec2, p1: Vec2, p2: Vec2): { min: Vec2; max: Vec2 } {
  const xs = [p0.x, p2.x, ...quadraticRoots(p0.x, p1.x, p2.x)
    .filter((t) => t > 0 && t < 1)
    .map((t) => quadraticPoint(p0, p1, p2, t).x)]
  const ys = [p0.y, p2.y, ...quadraticRoots(p0.y, p1.y, p2.y)
    .filter((t) => t > 0 && t < 1)
    .map((t) => quadraticPoint(p0, p1, p2, t).y)]
  return { min: { x: Math.min(...xs), y: Math.min(...ys) }, max: { x: Math.max(...xs), y: Math.max(...ys) } }
}

/**
 * Bornes exactes d'une cubique : on évalue les extrema sur chaque axe
 * (racines de la dérivée, équation quadratique) en plus des extrémités.
 */
export function cubicBounds(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2): { min: Vec2; max: Vec2 } {
  const intervals: number[] = [0, 1]
  intervals.push(...cubicDerivativeRoots(p0.x, p1.x, p2.x, p3.x))
  intervals.push(...cubicDerivativeRoots(p0.y, p1.y, p2.y, p3.y))
  const xs: number[] = []
  const ys: number[] = []
  for (const t of intervals) {
    if (t < 0 || t > 1) continue
    const p = cubicPoint(p0, p1, p2, p3, t)
    xs.push(p.x)
    ys.push(p.y)
  }
  return {
    min: { x: Math.min(...xs), y: Math.min(...ys) },
    max: { x: Math.max(...xs), y: Math.max(...ys) }
  }
}

/** Racines réelles dans ]0, 1[ de la dérivée d'une cubique sur un axe. */
function cubicDerivativeRoots(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 2 * (p0 - 2 * p1 + p2)
  const c = p1 - p0
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-9) return []
    const root = -c / b
    return root > 0 && root < 1 ? [root] : []
  }
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return []
  const sqrt = Math.sqrt(discriminant)
  const roots: number[] = []
  const r1 = (-b + sqrt) / (2 * a)
  const r2 = (-b - sqrt) / (2 * a)
  if (r1 > 0 && r1 < 1) roots.push(r1)
  if (r2 > 0 && r2 < 1) roots.push(r2)
  return roots
}

/**
 * Aplatit une cubique en polyline. Critère d'arrêt : la distance maximale des
 * points de contrôle au segment `[P0, P3]` sous le seuil — subdivision
 * récursive de de Casteljau au point milieu sinon.
 */
export function flattenCubic(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, tolerance = 0.5): Vec2[] {
  const points: Vec2[] = []
  const recurse = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): void => {
    const flatness = Math.max(distToSegment(b, a, d), distToSegment(c, a, d))
    if (flatness < tolerance) {
      points.push(d)
      return
    }
    const { left, right } = splitCubic(a, b, c, d, 0.5)
    recurse(left[0]!, left[1]!, left[2]!, left[3]!)
    recurse(right[0]!, right[1]!, right[2]!, right[3]!)
  }
  points.push(p0)
  recurse(p0, p1, p2, p3)
  return points
}

/** Longueur approchée d'une cubique par aplatissement. */
export function cubicLength(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, tolerance = 0.5): number {
  const polyline = flattenCubic(p0, p1, p2, p3, tolerance)
  let total = 0
  for (let i = 1; i < polyline.length; i++) {
    total += distance(polyline[i - 1]!, polyline[i]!)
  }
  return total
}

/** Une quadratique est convertible en cubique équivalente (exact). */
export function quadraticToCubic(p0: Vec2, p1: Vec2, p2: Vec2): Cubic {
  return [
    p0,
    lerp(p0, p1, 2 / 3),
    lerp(p2, p1, 2 / 3),
    p2
  ]
}

export interface ArcDescriptor {
  start: Vec2
  radius: { rx: number; ry: number }
  rotationDegrees: number
  largeArc: boolean
  sweep: boolean
  end: Vec2
}

/**
 * Convertit un arc SVG (A/a) en une ou plusieurs cubiques de Bézier
 * (algorithme de paramétrisation centre F.6.5 de la spécification SVG 1.1,
 * segments limités à 90° chacun pour un bon contrôle des poignées).
 */
export function arcToCubics(arc: ArcDescriptor): Cubic[] {
  const { start, end, rotationDegrees } = arc
  let rx = Math.abs(arc.radius.rx)
  let ry = Math.abs(arc.radius.ry)
  const phi = (rotationDegrees % 360) * DEG_TO_RAD

  if (start.x === end.x && start.y === end.y) return []
  if (rx === 0 || ry === 0) return []

  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const dx = (start.x - end.x) / 2
  const dy = (start.y - end.y) / 2
  const x1p = cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    const scale = Math.sqrt(lambda)
    rx *= scale
    ry *= scale
  }

  const rxSq = rx * rx
  const rySq = ry * ry
  const numerator = Math.max(0, rxSq * rySq - rxSq * y1p * y1p - rySq * x1p * x1p)
  const denominator = rxSq * y1p * y1p + rySq * x1p * x1p
  const coeff = denominator === 0 ? 0 : Math.sqrt(numerator / denominator)
  const sign = arc.largeArc !== arc.sweep ? 1 : -1
  const cxp = (sign * coeff * rx * y1p) / ry
  const cyp = (sign * coeff * -ry * x1p) / rx

  const cx = cosPhi * cxp - sinPhi * cyp + (start.x + end.x) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (start.y + end.y) / 2

  const ux = (x1p - cxp) / rx
  const uy = (y1p - cyp) / ry
  const vx = (-x1p - cxp) / rx
  const vy = (-y1p - cyp) / ry

  /** Angle signé entre les vecteurs `(u1,v1)` et `(u2,v2)`. */
  const angle = (u1: number, v1: number, u2: number, v2: number): number => {
    const dot = u1 * u2 + v1 * v2
    const len = Math.sqrt((u1 * u1 + v1 * v1) * (u2 * u2 + v2 * v2))
    if (len === 0) return 0
    const cos = Math.max(-1, Math.min(1, dot / len))
    const theta = Math.acos(cos)
    return u1 * v2 - v1 * u2 < 0 ? -theta : theta
  }

  let theta1 = angle(1, 0, ux, uy)
  let deltaTheta = angle(ux, uy, vx, vy)
  if (!arc.sweep && deltaTheta > 0) deltaTheta -= Math.PI * 2
  if (arc.sweep && deltaTheta < 0) deltaTheta += Math.PI * 2
  if (Math.abs(deltaTheta) === Math.PI * 2) deltaTheta = 0

  const segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2))
  const segmentAngle = deltaTheta / segments
  const kappa = (4 / 3) * Math.tan(segmentAngle / 4)

  const cubics: Cubic[] = []
  let current = start
  for (let i = 0; i < segments; i++) {
    const theta2 = theta1 + segmentAngle
    const cosT1 = Math.cos(theta1)
    const sinT1 = Math.sin(theta1)
    const cosT2 = Math.cos(theta2)
    const sinT2 = Math.sin(theta2)

    const p1 = {
      x: current.x + kappa * (-rx * cosPhi * sinT1 - ry * sinPhi * cosT1),
      y: current.y + kappa * (-rx * sinPhi * sinT1 + ry * cosPhi * cosT1)
    }
    const p3 = {
      x: cx + rx * cosPhi * cosT2 - ry * sinPhi * sinT2,
      y: cy + rx * sinPhi * cosT2 + ry * cosPhi * sinT2
    }
    const tangent2 = {
      x: -rx * sinT2 * cosPhi - ry * cosT2 * sinPhi,
      y: -rx * sinT2 * sinPhi + ry * cosT2 * cosPhi
    }
    const p2 = {
      x: p3.x - kappa * tangent2.x,
      y: p3.y - kappa * tangent2.y
    }
    cubics.push([{ ...current }, p1, p2, p3])

    theta1 = theta2
    current = p3
  }
  // Le dernier point doit être exactement `end` (accumulation d'arrondis).
  const last = cubics.at(-1)
  if (last) last[3] = { x: end.x, y: end.y }
  return cubics
}