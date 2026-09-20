import { get, writable } from 'svelte/store'
import { SceneGraph } from '../core/scene/SceneGraph'
import type { AnyNode } from '../core/scene/SceneNode'
import type { SceneGraphCommandOptions } from '../core/history/SceneGraphCommand'
import { historyState, runSceneGraphCommand } from './history.store'

// Scène vide au lancement : les formes sont créées par les outils de dessin.
export const sceneGraph = writable(new SceneGraph())

// Toute mutation du document passe par une commande réversible (AGENTS.md §10).
// Après chaque changement d'historique (push, undo, redo, coalescing), la
// scène est re-notifiée pour que le renderer redessine.
historyState.subscribe(() => {
  sceneGraph.set(get(sceneGraph))
})

/**
 * Pousse une commande réversible sur la scène courante.
 * Le champ `apply` mute les nœuds existants (mêmes références), ce qui
 * permet de rester sur le flux "commande → mutation → dirty → render".
 */
export function commitSceneCommand(options: SceneGraphCommandOptions): void {
  runSceneGraphCommand(get(sceneGraph), options)
}

export function mutateNode(id: string, mutate: (node: AnyNode) => void, label = 'Modifier le calque'): void {
  commitSceneCommand({
    label,
    apply: () => {
      const scene = get(sceneGraph)
      const node = scene.getNode(id)
      if (node) mutate(node)
    }
  })
}

export function toggleNodeVisible(id: string): void {
  commitSceneCommand({
    label: 'Afficher / masquer le calque',
    coalesceKey: `visibility:${id}`,
    apply: () => {
      const scene = get(sceneGraph)
      const node = scene.getNode(id)
      if (node) node.visible = !node.visible
    }
  })
}

/**
 * Déplace un nœud dans la pile des calques (réordonnancement ou changement de
 * parent). `index` 0 = bas de pile ; la position maximale = sommet (avant-plan).
 * `coalesceKey` permet de fusionner une suite de déplacements d'un même
 * glisser-déposer en une seule entrée d'historique.
 */
export function reorderNode(childId: string, parentId: string | null, index: number, coalesceKey?: string): void {
  commitSceneCommand({
    label: 'Réordonner les calques',
    coalesceKey,
    apply: () => {
      get(sceneGraph).moveChild(childId, parentId, index)
    }
  })
}