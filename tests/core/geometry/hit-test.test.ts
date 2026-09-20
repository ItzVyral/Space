import { describe, expect, it } from 'vitest'
import { hitTestAnchors, hitTestScene, pointInPolygon } from '../../../src/core/geometry/hit-test'
import { flattenPath } from '../../../src/core/geometry/hit-test'
import { SceneGraph } from '../../../src/core/scene/SceneGraph'
import { createEllipseNode, createPathNode, createRectNode } from '../../../src/core/scene/SceneNode'
import { translation } from '../../../src/core/scene/Transform'
import { vec } from '../../../src/core/geometry/vec'
import type { AnyNode } from '../../../src/core/scene/SceneNode'

function fillNode(node: { fill: unknown }): void {
  node.fill = { type: 'solid', color: '#000', opacity: 1 }
}

function strokeNode(node: { stroke: unknown }): void {
  node.stroke = { color: '#000', width: 1, opacity: 1 }
}

describe('hitTestNode — rect', () => {
  it('intérieur : hit si fill, miss sinon', () => {
    const filled = createRectNode('r', { width: 100, height: 50 })
    fillNode(filled)
    expect(hitTestScene(scene1(filled), 10, 10)).toBe('r')
    const plain = createRectNode('r2', { width: 100, height: 50 })
    expect(hitTestScene(scene1(plain), 10, 10)).toBeNull()
  })

  it('bord : hit sur le stroke à tolérance', () => {
    const node = createRectNode('r', { width: 100, height: 50 })
    strokeNode(node)
    expect(hitTestScene(scene1(node), 50, 51.5)).toBe('r')
    expect(hitTestScene(scene1(node), 50, 60)).toBeNull()
  })

  it('hors boîte : miss', () => {
    const node = createRectNode('r', { width: 100, height: 50 })
    fillNode(node)
    expect(hitTestScene(scene1(node), 200, 200)).toBeNull()
  })

  it('translate : coordonnées monde respectées', () => {
    const node = createRectNode('r', { width: 10, height: 10 })
    fillNode(node)
    node.transform = translation(100, 50)
    expect(hitTestScene(scene1(node), 104, 55)).toBe('r')
    expect(hitTestScene(scene1(node), 5, 5)).toBeNull()
  })

  it('coins arrondis : la pointe (hors du coin) n\'est pas dans le fill', () => {
    const node = createRectNode('r', { width: 100, height: 100, rx: 20, ry: 20 })
    fillNode(node)
    // Au centre : hit. Près du coin dans la zone arrondie exclue : miss.
    expect(hitTestScene(scene1(node), 50, 50)).toBe('r')
    expect(hitTestScene(scene1(node), 1, 1)).toBeNull()
  })
})

describe('hitTestNode — ellipse et chemin', () => {
  it('ellipse : intérieur fill, bord stroke, extérieur', () => {
    const e = createEllipseNode('e', { width: 200, height: 100 })
    fillNode(e)
    expect(hitTestScene(scene1(e), 100, 50)).toBe('e')
    const stroke = createEllipseNode('e2', { width: 200, height: 100 })
    strokeNode(stroke)
    expect(hitTestScene(scene1(stroke), 199.5, 50)).toBe('e2')
    expect(hitTestScene(scene1(stroke), 0.5, 50)).toBe('e2')
    expect(hitTestScene(scene1(stroke), 205, 50)).toBeNull()
    expect(hitTestScene(scene1(stroke), 120, 120)).toBeNull()
  })

  it('chemin fermé : point dans le polygone', () => {
    const p = createPathNode('p', {
      closed: true,
      points: [
        { position: vec(0, 0), handleIn: null, handleOut: null, type: 'corner' },
        { position: vec(10, 0), handleIn: null, handleOut: null, type: 'corner' },
        { position: vec(5, 10), handleIn: null, handleOut: null, type: 'corner' }
      ]
    })
    fillNode(p)
    expect(hitTestScene(scene1(p), 5, 4)).toBe('p')
    expect(hitTestScene(scene1(p), 50, 50)).toBeNull()
  })

  it('chemin ouvert : traité comme fermé pour le fill', () => {
    const p = createPathNode('p', {
      points: [
        { position: vec(0, 0), handleIn: null, handleOut: null, type: 'corner' },
        { position: vec(10, 0), handleIn: null, handleOut: null, type: 'corner' },
        { position: vec(0, 10), handleIn: null, handleOut: null, type: 'corner' }
      ]
    })
    fillNode(p)
    expect(hitTestScene(scene1(p), 1, 3)).toBe('p')
  })

  it('chemin courbé : hit près de la courbe mais pas du segment', () => {
    const p = createPathNode('p', {
      points: [
        { position: vec(0, 0), handleIn: null, handleOut: vec(50, 100), type: 'symmetric' },
        { position: vec(100, 0), handleIn: null, handleOut: null, type: 'corner' }
      ]
    })
    strokeNode(p)
    expect(hitTestScene(scene1(p), 50, 49)).toBe('p')
    expect(hitTestScene(scene1(p), 50, 90)).toBeNull()
  })

  it('chemin vide : jamais touché', () => {
    const p = createPathNode('p')
    fillNode(p)
    expect(hitTestScene(scene1(p), 0, 0)).toBeNull()
  })
})

describe('hitTestScene — hiérarchie et filtres', () => {
  it('renvoie le nœud du dessus parmi ceux qui se chevauchent', () => {
    const scene = new SceneGraph()
    const back = createRectNode('back', { width: 50, height: 50 })
    const front = createRectNode('front', { width: 50, height: 50 })
    fillNode(back)
    fillNode(front)
    front.transform = translation(20, 0)
    scene.addNode(back)
    scene.addNode(front)
    expect(hitTestScene(scene, 30, 25)).toBe('front')
    expect(hitTestScene(scene, 8, 8)).toBe('back')
  })

  it('ignore verrouillé et invisibles et groupes', () => {
    const scene = new SceneGraph()
    const locked = createRectNode('locked', { width: 50, height: 50 })
    locked.locked = true
    const invisible = createRectNode('inv', { width: 50, height: 50 })
    invisible.visible = false
    fillNode(locked)
    fillNode(invisible)
    scene.addNode(locked)
    scene.addNode(invisible)
    expect(hitTestScene(scene, 25, 25)).toBeNull()
    expect(hitTestScene(scene, 25, 25, { ignoreLocked: true })).toBe('locked')
    expect(hitTestScene(scene, 25, 25, { ignoreInvisible: true })).toBe('inv')
  })
})

describe('pointInPolygon / flattenPath', () => {
  it('parité : intérieur pair/impair', () => {
    const poly = [vec(0, 0), vec(10, 0), vec(10, 10), vec(0, 10)]
    expect(pointInPolygon(vec(5, 5), poly)).toBe(true)
    expect(pointInPolygon(vec(15, 5), poly)).toBe(false)
    expect(pointInPolygon(vec(5, -1), poly)).toBe(false)
  })

  it('flattenPath conserve les extrémités et les points droits', () => {
    const p = createPathNode('p', {
      points: [
        { position: vec(0, 0), handleIn: null, handleOut: null, type: 'corner' },
        { position: vec(10, 0), handleIn: null, handleOut: null, type: 'corner' },
        { position: vec(10, 10), handleIn: null, handleOut: null, type: 'corner' }
      ]
    })
    const flat = flattenPath(p)
    expect(flat[0]).toEqual(vec(0, 0))
    expect(flat).toContainEqual(vec(10, 0))
    expect(flat.at(-1)).toEqual(vec(10, 10))
  })
})

describe('hitTestAnchors — édition de points', () => {
  const path = createPathNode('p', {
    points: [
      { position: vec(0, 0), handleIn: null, handleOut: vec(40, 20), type: 'symmetric' },
      { position: vec(100, 0), handleIn: null, handleOut: null, type: 'corner' }
    ]
  })

  it('touche la position d\'un point', () => {
    const hit = hitTestAnchors(path, 1, 1, 3)
    expect(hit).toEqual({ index: 0, part: 'position' })
  })

  it('priorité à la poignée la plus proche', () => {
    const hit = hitTestAnchors(path, 39, 20, 3)
    expect(hit).toEqual({ index: 0, part: 'handleOut' })
  })

  it('null en dehors de la tolérance', () => {
    expect(hitTestAnchors(path, 500, 500, 3)).toBeNull()
  })

  it('respecte le transform du nœud', () => {
    path.transform = translation(50, 50)
    expect(hitTestAnchors(path, 51, 51, 3)?.part).toBe('position')
  })
})

function scene1(node: AnyNode): SceneGraph {
  const scene = new SceneGraph()
  scene.addNode(node)
  return scene
}