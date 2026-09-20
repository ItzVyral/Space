import { describe, expect, it } from 'vitest'
import {
  boundsFromPoints,
  fitViewport,
  mergeBounds,
  nodeBounds,
  normalizeRect,
  pointInBounds,
  rectsIntersect,
  sceneBounds
} from '../../../src/core/geometry/bounds'
import { SceneGraph } from '../../../src/core/scene/SceneGraph'
import { createEllipseNode, createPathNode, createRectNode, createTextNode, createGroupNode } from '../../../src/core/scene/SceneNode'
import { translation } from '../../../src/core/scene/Transform'
import { vec } from '../../../src/core/geometry/vec'

describe('boundsFromPoints / normalizeRect', () => {
  it('retourne null pour aucun point', () => {
    expect(boundsFromPoints([])).toBeNull()
  })

  it('borne un ensemble de points', () => {
    const b = boundsFromPoints([vec(2, 3), vec(8, 6), vec(5, 1)])
    expect(b).toEqual({ x: 2, y: 1, w: 6, h: 5 })
  })

  it('normalise des coins saisis dans le désordre', () => {
    expect(normalizeRect(30, 40, 10, 20)).toEqual({ x: 10, y: 20, w: 20, h: 20 })
    expect(normalizeRect(-5, -5, 5, 5)).toEqual({ x: -5, y: -5, w: 10, h: 10 })
  })
})

describe('nodeBounds', () => {
  it('rectangle à l\'origine', () => {
    const node = createRectNode('r', { width: 220, height: 140 })
    node.transform = translation(80, 80)
    expect(nodeBounds(node)).toEqual({ x: 80, y: 80, w: 220, h: 140 })
  })

  it('rectangle à coins arrondis : boîte du carré englobant', () => {
    const node = createRectNode('r', { width: 100, height: 100, rx: 20 })
    expect(nodeBounds(node)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
  })

  it('rectangle pivoté de 90° : largeur/hauteur échangées', () => {
    const node = createRectNode('r', { width: 10, height: 20 })
    node.transform = { m00: 0, m01: -1, m02: 0, m10: 1, m11: 0, m12: 0 }
    expect(nodeBounds(node)).toEqual({ x: -20, y: 0, w: 20, h: 10 })
  })

  it('ellipse : bornes exactes du gabarit', () => {
    const node = createEllipseNode('e', { width: 200, height: 100 })
    expect(nodeBounds(node)).toEqual({ x: 0, y: 0, w: 200, h: 100 })
  })

  it('ellipse pivotée de 90° : bornes échangées', () => {
    const node = createEllipseNode('e', { width: 200, height: 100 })
    node.transform = { m00: 0, m01: -1, m02: 0, m10: 1, m11: 0, m12: 0 }
    expect(nodeBounds(node)).toEqual({ x: -100, y: 0, w: 100, h: 200 })
  })

  it('chemin droit a>b : bornes sur les extrémités', () => {
    const node = createPathNode('p', { points: [{ position: vec(10, 20), handleIn: null, handleOut: null, type: 'corner' }, { position: vec(30, 40), handleIn: null, handleOut: null, type: 'corner' }] })
    expect(nodeBounds(node)).toEqual({ x: 10, y: 20, w: 20, h: 20 })
  })

  it('chemin avec poignée : la boîte couvre les points de contrôle', () => {
    const node = createPathNode('p', {
      points: [
        { position: vec(0, 0), handleIn: null, handleOut: vec(200, 50), type: 'symmetric' },
        { position: vec(100, 0), handleIn: null, handleOut: null, type: 'corner' }
      ]
    })
    const b = nodeBounds(node)!
    expect(b.x).toBe(0)
    expect(b.w).toBeGreaterThanOrEqual(200)
  })

  it('chemin vide : null', () => {
    expect(nodeBounds(createPathNode('p'))).toBeNull()
  })

  it('groupe et texte : null', () => {
    expect(nodeBounds(createGroupNode('g'))).toBeNull()
    expect(nodeBounds(createTextNode('t'))).toBeNull()
  })
})

describe('sceneBounds / mergeBounds', () => {
  it('fusionne les bornes de plusieurs nœuds', () => {
    expect(mergeBounds({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toEqual({ x: 0, y: 0, w: 15, h: 15 })
  })

  it('borne toute la scène', () => {
    const scene = new SceneGraph()
    const a = createRectNode('a', { width: 100, height: 50 })
    const b = createRectNode('b', { width: 50, height: 100 })
    b.transform = translation(200, 0)
    scene.addNode(a)
    scene.addNode(b)
    expect(sceneBounds(scene)).toEqual({ x: 0, y: 0, w: 250, h: 100 })
  })

  it('scène vide : null', () => {
    expect(sceneBounds(new SceneGraph())).toBeNull()
  })
})

describe('pointInBounds / rectsIntersect / fitViewport', () => {
  const box = { x: 0, y: 0, w: 10, h: 10 }

  it('pointInBounds respecte les bords inclus', () => {
    expect(pointInBounds(box, 0, 0)).toBe(true)
    expect(pointInBounds(box, 10, 10)).toBe(true)
    expect(pointInBounds(box, 10.001, 5)).toBe(false)
    expect(pointInBounds(box, -1, 5)).toBe(false)
  })

  it('rectsIntersect détecte chevauchement et disjonction', () => {
    expect(rectsIntersect(box, { x: 5, y: 5, w: 10, h: 10 })).toBe(true)
    expect(rectsIntersect(box, { x: 20, y: 20, w: 10, h: 10 })).toBe(false)
    expect(rectsIntersect(box, { x: 10, y: 0, w: 5, h: 5 })).toBe(true)
  })

  it('fitViewport cadre le contenu avec une marge', () => {
    const scene = new SceneGraph()
    scene.addNode(createRectNode('r', { width: 100, height: 100 }))
    const vp = fitViewport(scene, 400, 300, 64)
    expect(vp.zoom).toBeCloseTo(1.72, 3)
  })

  it('fitViewport sur scène vide : centré zoom 1', () => {
    expect(fitViewport(new SceneGraph(), 400, 300)).toEqual({ x: 200, y: 150, zoom: 1 })
  })
})