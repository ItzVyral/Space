import type { SceneGraph } from '../scene/SceneGraph'
import type { AnyNode } from '../scene/SceneNode'
import type { HistoryCommand } from './UndoRedoStack'

export interface SceneGraphCommandOptions {
  readonly label: string
  readonly coalesceKey?: string
  /** Mutation appliquée au scene graph passé au constructeur. */
  readonly apply: () => void
}

export interface SceneGraphCommand extends HistoryCommand {
  readonly kind: 'scene-graph'
  /** État du graphe après exécution (pour permettre le coalescing). */
  readonly afterState: () => AnyNode[]
}

/**
 * Crée une commande réversible autour d'une mutation du scene graph.
 *
 * La scène est photographiée (snapshot par clonage profond) avant et après
 * la mutation ; undo/redo restaurent ces états. Le snapshot complet est
 * volontairement simple et sûr — sur de très grandes scènes, un diff par
 * sous-arbre sera introduit lors de la passe performance (Phase 5).
 *
 * Idempotence : `apply` est exécuté exactement une fois, à la création.
 * Ne pas appeler `redo()` à la création : la mutation est déjà appliquée.
 */
export function createSceneGraphCommand(
  scene: SceneGraph,
  options: SceneGraphCommandOptions
): SceneGraphCommand {
  const before = snapshotScene(scene)
  options.apply()
  let after = snapshotScene(scene)

  const command: SceneGraphCommand = {
    kind: 'scene-graph',
    label: options.label,
    coalesceKey: options.coalesceKey,
    undo: () => restoreScene(scene, before),
    redo: () => restoreScene(scene, after),
    afterState: () => after,
    absorb: (following) => {
      if (isSceneGraphCommand(following)) {
        after = following.afterState()
      }
    }
  }
  return command
}

// Le coalescing n'a de sens qu'entre commandes de scene graph ; après avoir
// absorbé l'état suivant, la commande suivante est abandonnée.
function isSceneGraphCommand(command: HistoryCommand): command is SceneGraphCommand {
  return (command as SceneGraphCommand).kind === 'scene-graph'
}

function snapshotScene(scene: SceneGraph): AnyNode[] {
  const nodes: AnyNode[] = []
  scene.walk((node) => nodes.push(structuredClone(node)))
  return nodes
}

function restoreScene(scene: SceneGraph, nodes: AnyNode[]): void {
  scene.clear()
  for (const node of nodes) {
    scene.addNode(node, node.parentId)
  }
}