/**
 * Conversion des primitives (rect/ellipse) en chemins libres (`PathNode`).
 * Utilisée quand l'édition de points démarre sur une primitive : la forme est
 * alors « figée » en chemin (l'undo restore la primitive).
 *
 * Le rayon de coin d'un rectangle n'est PAS conservé par la conversion
 * (coins nets) — décision documentée : une vraie reproduction arrondie
 * exigerait des poignées Bézier par coin, réservée à une passe ultérieure.
 * L'ellipse est reproduite fidèlement via 4 ancres à poignées symétriques
 * (facteur de Magarotto κ = 4/3·tan(π/8)).
 */
import type { AnchorPoint, EllipseNode, PathNode, RectNode } from './SceneNode'
import { createPathNode } from './SceneNode'
import { vec } from '../geometry/vec'

const KAPPA = 0.5522847498307936

function cornerPoint(x: number, y: number): AnchorPoint {
  return { position: vec(x, y), handleIn: null, handleOut: null, type: 'corner' }
}

/** Rectangle (coins nets) → chemin fermé de 4 ancres, dans le sens horaire. */
export function rectToPath(rect: RectNode): PathNode {
  const path = createPathNode(rect.id, { closed: true, name: rect.name })
  path.points = [
    cornerPoint(0, 0),
    cornerPoint(rect.width, 0),
    cornerPoint(rect.width, rect.height),
    cornerPoint(0, rect.height)
  ]
  return path
}

/**
 * Ellipse → chemin fermé de 4 ancres cardinales à poignées symétriques.
 * Les poignées horizontales ont la longueur κ·rx, les verticales κ·ry.
 */
export function ellipseToPath(ellipse: EllipseNode): PathNode {
  const rx = ellipse.width / 2
  const ry = ellipse.height / 2
  const path = createPathNode(ellipse.id, { closed: true, name: ellipse.name })

  const top: AnchorPoint = {
    position: vec(rx, 0),
    handleIn: vec(rx - KAPPA * rx, 0),
    handleOut: vec(rx + KAPPA * rx, 0),
    type: 'symmetric'
  }
  const right: AnchorPoint = {
    position: vec(ellipse.width, ry),
    handleIn: vec(ellipse.width, ry - KAPPA * ry),
    handleOut: vec(ellipse.width, ry + KAPPA * ry),
    type: 'symmetric'
  }
  const bottom: AnchorPoint = {
    position: vec(rx, ellipse.height),
    handleIn: vec(rx + KAPPA * rx, ellipse.height),
    handleOut: vec(rx - KAPPA * rx, ellipse.height),
    type: 'symmetric'
  }
  const left: AnchorPoint = {
    position: vec(0, ry),
    handleIn: vec(0, ry + KAPPA * ry),
    handleOut: vec(0, ry - KAPPA * ry),
    type: 'symmetric'
  }
  path.points = [top, right, bottom, left]
  return path
}

/** Version « chemin » d'une primitive quelconque, ou null si déjà un chemin. */
export function primitiveToPath(node: RectNode | EllipseNode): PathNode {
  return node.type === 'rect' ? rectToPath(node) : ellipseToPath(node)
}