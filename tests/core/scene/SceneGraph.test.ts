import { describe, expect, it } from 'vitest'
import { createEllipseNode, createGroupNode, createRectNode } from '../../../src/core/scene/SceneNode'
import { SceneGraph } from '../../../src/core/scene/SceneGraph'

function makeGraph(): SceneGraph {
  const graph = new SceneGraph()
  const a = createRectNode('a', { width: 10, height: 10 })
  const b = createRectNode('b', { width: 20, height: 20 })
  const g = createGroupNode('g')
  graph.addNode(g)
  graph.addNode(a)
  graph.addNode(b, g.id)
  return graph
}

describe('SceneGraph', () => {
  it('ajoute et retrouve un nœud racine', () => {
    const graph = new SceneGraph()
    const rect = createRectNode('r', { width: 10, height: 10 })
    graph.addNode(rect)
    expect(graph.size).toBe(1)
    expect(graph.getNode('r')).toBe(rect)
    expect(graph.hasNode('r')).toBe(true)
    expect(graph.getNode('inconnu')).toBeUndefined()
  })

  it('refuse les identifiants dupliqués', () => {
    const graph = new SceneGraph()
    graph.addNode(createRectNode('dup', { width: 1, height: 1 }))
    expect(() => graph.addNode(createRectNode('dup', { width: 1, height: 1 }))).toThrow()
  })

  it('ordonne les enfants par ordre d\'insertion', () => {
    const graph = makeGraph()
    expect(graph.childrenOf('g').map((n) => n.id)).toEqual(['b'])
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['g', 'a'])
  })

  it('supprime un nœud et l\'écarte des enfants du parent', () => {
    const graph = new SceneGraph()
    const parent = createGroupNode('p')
    const child = createRectNode('c', { width: 5, height: 5 })
    graph.addNode(parent)
    graph.addNode(child, parent.id)
    graph.removeNode(child.id)
    expect(graph.hasNode(child.id)).toBe(false)
    expect(graph.childrenOf(parent.id)).toEqual([])
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['p'])
  })

  it('supprime récursivement les sous-arbres', () => {
    const graph = new SceneGraph()
    const outer = createGroupNode('outer')
    const inner = createGroupNode('inner')
    const leaf = createRectNode('leaf', { width: 1, height: 1 })
    graph.addNode(outer)
    graph.addNode(inner, outer.id)
    graph.addNode(leaf, inner.id)
    graph.removeNode(outer.id)
    expect(graph.size).toBe(0)
    expect(graph.getNode('inner')).toBeUndefined()
    expect(graph.getNode('leaf')).toBeUndefined()
  })

  it('parcourt la scène en profondeur', () => {
    const graph = makeGraph()
    const seen: string[] = []
    graph.walk((node) => seen.push(node.id))
    expect(seen).toEqual(['g', 'b', 'a'])
  })

  it('génère des identifiants uniques', () => {
    const graph = new SceneGraph()
    graph.addNode(createEllipseNode('e_1', { width: 2, height: 2 }))
    const ids = [graph.generateId('e'), graph.generateId('e'), graph.generateId('e')]
    expect(new Set(ids).size).toBe(3)
    expect(ids.includes('e_1')).toBe(false)
  })

  it('clear() vide complètement le graphe', () => {
    const graph = makeGraph()
    graph.clear()
    expect(graph.size).toBe(0)
    expect(graph.childrenOf()).toEqual([])
  })

  it('un graphe vide se parcourt sans erreur', () => {
    const graph = new SceneGraph()
    const seen: string[] = []
    graph.walk((node) => seen.push(node.id))
    expect(seen).toEqual([])
    graph.removeNode('inexistant')
    expect(graph.size).toBe(0)
  })
})

describe('SceneGraph — réordonnancement des calques', () => {
  function rootScene(): SceneGraph {
    const graph = new SceneGraph()
    for (const id of ['a', 'b', 'c']) {
      graph.addNode(createRectNode(id, { width: 1, height: 1 }))
    }
    return graph
  }

  it('reorderChild déplace un enfant dans la liste de son parent', () => {
    const graph = rootScene()
    graph.reorderChild('a', 2)
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['b', 'c', 'a'])
    graph.reorderChild('c', 0)
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['c', 'b', 'a'])
  })

  it('moveChild change de parent en mettant à jour parentId', () => {
    const graph = new SceneGraph()
    const group = createGroupNode('g')
    graph.addNode(group)
    graph.addNode(createRectNode('a', { width: 1, height: 1 }))
    graph.addNode(createRectNode('b', { width: 1, height: 1 }), 'g')

    graph.moveChild('a', 'g', 0)
    expect(graph.getNode('a')?.parentId).toBe('g')
    expect(graph.childrenOf('g').map((n) => n.id)).toEqual(['a', 'b'])
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['g'])
  })

  it('moveChild remonte un nœud au niveau racine', () => {
    const graph = new SceneGraph()
    const group = createGroupNode('g')
    graph.addNode(group)
    graph.addNode(createRectNode('a', { width: 1, height: 1 }), 'g')

    graph.moveChild('a', null, 0)
    expect(graph.getNode('a')?.parentId).toBeNull()
    expect(graph.childrenOf('g')).toEqual([])
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['a', 'g'])
  })

  it('borne l\'index hors limites', () => {
    const graph = rootScene()
    graph.moveChild('a', null, 99)
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['b', 'c', 'a'])
    graph.moveChild('a', null, -5)
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('reorderChild et moveChild produisent le même ordre au même index', () => {
    const graph = rootScene()
    graph.reorderChild('c', 0)
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['c', 'a', 'b'])
  })

  it('refuse de déplacer un nœud dans lui-même', () => {
    const graph = rootScene()
    expect(() => graph.moveChild('a', 'a', 0)).toThrow(/lui-même/)
  })

  it('refuse de déplacer un nœud dans l\'un de ses descendants', () => {
    const graph = new SceneGraph()
    const outer = createGroupNode('outer')
    const inner = createGroupNode('inner')
    const leaf = createRectNode('leaf', { width: 1, height: 1 })
    graph.addNode(outer)
    graph.addNode(inner, 'outer')
    graph.addNode(leaf, 'inner')

    expect(() => graph.moveChild('outer', 'inner', 0)).toThrow(/descendants/)
    expect(() => graph.moveChild('outer', 'leaf', 0)).toThrow(/descendants/)
  })

  it('refuse un parent inexistant', () => {
    const graph = rootScene()
    expect(() => graph.moveChild('a', 'fantome', 0)).toThrow(/introuvable/)
    expect(() => graph.reorderChild('fantome', 0)).toThrow(/introuvable/)
  })

  it('laissé tel quel quand le déplacement est invalide (intégrité du graphe)', () => {
    const graph = rootScene()
    expect(() => graph.moveChild('a', 'fantome', 0)).toThrow()
    expect(graph.childrenOf().map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(graph.getNode('a')?.parentId).toBeNull()
  })
})