import { describe, expect, it } from 'vitest'
import { SceneGraph } from '../../../src/core/scene/SceneGraph'
import {
  createEllipseNode,
  createPathNode,
  createRectNode,
  type AnyNode
} from '../../../src/core/scene/SceneNode'
import { translation } from '../../../src/core/scene/Transform'
import { createSceneGraphCommand } from '../../../src/core/history/SceneGraphCommand'
import { UndoRedoStack } from '../../../src/core/history/UndoRedoStack'

function twoNodeScene(): SceneGraph {
  const graph = new SceneGraph()
  const rect = createRectNode('a', { width: 100, height: 60, rx: 4 })
  rect.transform = translation(10, 20)
  rect.fill = { type: 'solid', color: '#5b9bd5', opacity: 1 }
  const ellipse = createEllipseNode('b', { width: 40, height: 40 })
  ellipse.transform = translation(200, 50)
  graph.addNode(rect)
  graph.addNode(ellipse)
  return graph
}

function serialize(node: AnyNode | undefined): string | undefined {
  return node === undefined ? undefined : JSON.stringify(node)
}

describe('SceneGraphCommand', () => {
  it('annule puis ré-applique une translation de nœud', () => {
    const graph = twoNodeScene()
    const before = serialize(graph.getNode('a'))

    const command = createSceneGraphCommand(graph, {
      label: 'Déplacer le rectangle',
      apply: () => {
        const rect = graph.getNode('a')
        if (rect) rect.transform = translation(300, 120)
      }
    })

    expect(serialize(graph.getNode('a'))).not.toBe(before)

    command.undo()
    expect(graph.getNode('a')?.transform.m02).toBe(10)
    expect(graph.getNode('a')?.transform.m12).toBe(20)
    expect(serialize(graph.getNode('a'))).toBe(before)

    command.redo()
    expect(graph.getNode('a')?.transform.m02).toBe(300)
    expect(graph.getNode('a')?.transform.m12).toBe(120)
  })

  it('restaure plusieurs nœuds et leur ordre de parenté', () => {
    const graph = new SceneGraph()
    const parent = createRectNode('p', { width: 10, height: 10 })
    const child = createEllipseNode('c', { width: 5, height: 5 })
    graph.addNode(parent)
    graph.addNode(child, 'p')

    createSceneGraphCommand(graph, {
      label: 'Masquer la branche',
      apply: () => {
        const p = graph.getNode('p')
        const c = graph.getNode('c')
        if (p) p.visible = false
        if (c) c.visible = false
      }
    })

    const command = createSceneGraphCommand(graph, {
      label: 'Ré-afficher la branche',
      apply: () => {
        const p = graph.getNode('p')
        const c = graph.getNode('c')
        if (p) p.visible = true
        if (c) c.visible = true
      }
    })

    command.undo()
    expect(graph.getNode('p')?.visible).toBe(false)
    expect(graph.getNode('c')?.visible).toBe(false)
    expect(graph.childrenOf('p').map((n) => n.id)).toEqual(['c'])
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['p'])
  })

  it('undo sur un graphe vide revient à l\'état vide', () => {
    const graph = new SceneGraph()
    const command = createSceneGraphCommand(graph, {
      label: 'Ajouter un rectangle',
      apply: () => {
        graph.addNode(createRectNode('r', { width: 10, height: 10 }))
      }
    })
    expect(graph.size).toBe(1)

    command.undo()
    expect(graph.size).toBe(0)
    expect(graph.childrenOf()).toEqual([])

    command.redo()
    expect(graph.size).toBe(1)
    expect(graph.getNode('r')?.type).toBe('rect')
  })

  it('conserve l\'intégrité des points d\'un chemin après undo', () => {
    const graph = new SceneGraph()
    const path = createPathNode('path-1', {
      closed: true,
      points: [
        { position: { x: 0, y: 0 }, handleIn: null, handleOut: { x: 10, y: -5 }, type: 'smooth' },
        { position: { x: 50, y: 0 }, handleIn: null, handleOut: null, type: 'corner' },
        { position: { x: 25, y: 40 }, handleIn: { x: 30, y: 20 }, handleOut: null, type: 'symmetric' }
      ]
    })
    graph.addNode(path)

    const before = serialize(graph.getNode('path-1'))
    const command = createSceneGraphCommand(graph, {
      label: 'Déformer le chemin',
      apply: () => {
        const live = graph.getNode('path-1')
        if (live && live.type === 'path') {
          live.points[1]!.position = { x: 80, y: -30 }
        }
      }
    })

    command.undo()
    expect(serialize(graph.getNode('path-1'))).toBe(before)

    const restored = graph.getNode('path-1')
    if (restored?.type !== 'path') throw new Error('Le nœud restauré doit être un chemin')
    expect(restored.points[0]).toEqual({
      position: { x: 0, y: 0 },
      handleIn: null,
      handleOut: { x: 10, y: -5 },
      type: 'smooth'
    })

    command.redo()
    const redone = graph.getNode('path-1')
    expect(redone && redone.type === 'path' ? redone.points[1]?.position : null).toEqual({ x: 80, y: -30 })
  })

  it('le snapshot reste isolé des mutations ultérieures', () => {
    const graph = twoNodeScene()
    const command = createSceneGraphCommand(graph, {
      label: 'Déplacer le rectangle',
      apply: () => {
        const rect = graph.getNode('a')
        if (rect) rect.transform = translation(500, 500)
      }
    })
    command.undo()

    // Muter le nœud restauré ne doit pas corrompre l'état "after" de la commande.
    const rect = graph.getNode('a')
    if (rect) rect.transform = translation(-1, -1)

    command.redo()
    expect(graph.getNode('a')?.transform.m02).toBe(500)
    expect(graph.getNode('a')?.transform.m12).toBe(500)
  })

  it('fusionne (coalescing) deux mutations consécutives via la pile', () => {
    const graph = twoNodeScene()
    const stack = new UndoRedoStack()

    stack.push(
      createSceneGraphCommand(graph, {
        label: 'Déplacer le rectangle',
        coalesceKey: 'move:a',
        apply: () => {
          const rect = graph.getNode('a')
          if (rect) rect.transform = translation(100, 100)
        }
      })
    )
    stack.push(
      createSceneGraphCommand(graph, {
        label: 'Déplacer le rectangle',
        coalesceKey: 'move:a',
        apply: () => {
          const rect = graph.getNode('a')
          if (rect) rect.transform = translation(120, 90)
        }
      })
    )

    expect(stack.size).toBe(1)
    expect(graph.getNode('a')?.transform.m02).toBe(120)

    stack.undo()
    expect(graph.getNode('a')?.transform.m02).toBe(10)
    expect(graph.getNode('a')?.transform.m12).toBe(20)

    stack.redo()
    expect(graph.getNode('a')?.transform.m02).toBe(120)
    expect(graph.getNode('a')?.transform.m12).toBe(90)
  })

  it('un graphe vide supporte undo/redo sans erreur', () => {
    const graph = new SceneGraph()
    const emptySnapshot = createSceneGraphCommand(graph, {
      label: 'Opération no-op',
      apply: () => {
        // aucune mutation
      }
    })
    emptySnapshot.undo()
    emptySnapshot.redo()
    expect(graph.size).toBe(0)
  })
})