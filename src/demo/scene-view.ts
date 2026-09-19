/**
 * Pont de compatibilité temporaire : la logique pure (bornes, hit-testing,
 * fit viewport) vit désormais dans `src/core/geometry/`. Ce module regroupe
 * les ré-exports pour ne pas casser les imports des composants tant que la
 * migration frontend n'est pas terminée.
 */
import type { SceneGraph } from '../core/scene/SceneGraph'
import type { AnyNode } from '../core/scene/SceneNode'
import {
  fitViewport,
  mergeBounds,
  nodeBounds,
  normalizeRect,
  pointInBounds,
  rectsIntersect,
  sceneBounds
} from '../core/geometry/bounds'
import type { Bounds } from '../core/geometry/bounds'
import { hitTestScene } from '../core/geometry/hit-test'

export type { Bounds } from '../core/geometry/bounds'
export { nodeBounds, sceneBounds, fitViewport, normalizeRect, rectsIntersect, pointInBounds, mergeBounds }

/** Nœud le plus haut sous le point monde (délègue au hit-testing core). */
export function hitTest(scene: SceneGraph, x: number, y: number): string | null {
  return hitTestScene(scene, x, y)
}

/** Identifiants des nœuds sélectionnables dont la bounding box intersecte le rectangle monde. */
export function nodesInRect(scene: SceneGraph, rect: Bounds): string[] {
  const hits: string[] = []
  scene.walk((node) => {
    if (!node.visible || node.locked || node.type === 'group' || node.type === 'text') return
    const b = nodeBounds(node)
    if (b && rectsIntersect(b, rect)) hits.push(node.id)
  })
  return hits
}

export type { AnyNode, SceneGraph }