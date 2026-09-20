import { SceneGraph } from '../core/scene/SceneGraph'
import {
  createEllipseNode,
  createPathNode,
  createRectNode,
  type AnchorPoint,
  type EllipseNode,
  type RectNode
} from '../core/scene/SceneNode'
import { translation, type Transform } from '../core/scene/Transform'

export interface DemoProject {
  id: string
  name: string
  edited: string
  createScene: () => SceneGraph
}

interface ShapeOptions {
  rx?: number
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
  opacity?: number
  name?: string
}

interface PathOptions {
  closed?: boolean
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  name?: string
}

class SceneBuilder {
  readonly graph = new SceneGraph()

  rect(x: number, y: number, w: number, h: number, o: ShapeOptions = {}): void {
    const node = createRectNode(this.graph.generateId('rect'), {
      width: w,
      height: h,
      rx: o.rx,
      name: o.name
    })
    this.style(node, translation(x, y), o)
  }

  ellipse(x: number, y: number, w: number, h: number, o: ShapeOptions = {}): void {
    const node = createEllipseNode(this.graph.generateId('ellipse'), {
      width: w,
      height: h,
      name: o.name
    })
    this.style(node, translation(x, y), o)
  }

  path(points: AnchorPoint[], o: PathOptions = {}): void {
    const node = createPathNode(this.graph.generateId('path'), {
      points,
      closed: o.closed ?? true,
      name: o.name
    })
    node.opacity = o.opacity ?? 1
    if (o.fill) node.fill = { type: 'solid', color: o.fill, opacity: 1 }
    if (o.stroke || o.strokeWidth) {
      node.stroke = { color: o.stroke ?? '#1f1f1f', width: o.strokeWidth ?? 1.5, opacity: 1 }
    }
    this.graph.addNode(node)
  }

  private style(node: RectNode | EllipseNode, t: Transform, o: ShapeOptions): void {
    node.transform = t
    node.opacity = o.opacity ?? 1
    if (o.fill) node.fill = { type: 'solid', color: o.fill, opacity: o.fillOpacity ?? 1 }
    if (o.stroke || o.strokeWidth) {
      node.stroke = { color: o.stroke ?? '#1f1f1f', width: o.strokeWidth ?? 1.5, opacity: 1 }
    }
    this.graph.addNode(node)
  }
}

function point(x: number, y: number, out?: [number, number], in_?: [number, number]): AnchorPoint {
  return {
    position: { x, y },
    handleOut: out ? { x: out[0], y: out[1] } : null,
    handleIn: in_ ? { x: in_[0], y: in_[1] } : null,
    type: 'smooth'
  }
}

function star(cx: number, cy: number, outer: number, inner: number): AnchorPoint[] {
  const pts: AnchorPoint[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    pts.push({
      position: { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r },
      handleIn: null,
      handleOut: null,
      type: 'corner'
    })
  }
  return pts
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'space-logo',
    name: 'Logo Space',
    edited: '2026-09-18T10:24:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      b.rect(0, 0, 320, 320, { rx: 72, fill: '#0d99ff' })
      b.path(
        [
          point(110, 130, [129, 95]),
          point(161, 120, [142, 129], [176, 137]),
          point(131, 160, [116, 151], [142, 156]),
          point(159, 190, [190, 183], [133, 191])
        ],
        { closed: false, stroke: '#ffffff', strokeWidth: 16 }
      )
      b.ellipse(110, 124, 12, 12, { fill: '#ffffff' })
      b.ellipse(154, 185, 12, 12, { fill: '#ffffff' })
      return b.graph
    }
  },
  {
    id: 'app-mobile',
    name: 'App mobile — Accueil',
    edited: '2026-09-17T18:02:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      b.rect(40, 40, 300, 640, { rx: 40, fill: '#ffffff', stroke: '#e3e3e3', strokeWidth: 2 })
      b.rect(150, 64, 80, 8, { rx: 4, fill: '#1f1f1f' })
      b.rect(70, 96, 240, 200, { rx: 18, fill: '#3a7bd5' })
      b.rect(70, 96, 240, 96, { rx: 18, fill: '#5b9bd5', opacity: 0.9 })
      b.ellipse(70, 320, 96, 96, { fill: '#c5b3e6' })
      b.rect(186, 320, 124, 96, { rx: 16, fill: '#f2d184' })
      b.rect(70, 476, 240, 48, { rx: 24, fill: '#0d99ff' })
      b.rect(70, 540, 112, 44, { rx: 22, fill: '#ffffff', stroke: '#0d99ff', strokeWidth: 2 })
      b.rect(198, 540, 112, 44, { rx: 22, fill: '#eef4ff' })
      return b.graph
    }
  },
  {
    id: 'icones-app',
    name: 'Icônes d’application',
    edited: '2026-09-16T09:40:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      const palette = ['#ef4444', '#f59e0b', '#10b981', '#0d99ff', '#7c3aed', '#ec4899']
      for (let i = 0; i < 6; i++) {
        const col = i % 3
        const row = Math.floor(i / 3)
        const x = 60 + col * 200
        const y = 60 + row * 200
        const c = palette[i]!
        b.rect(x, y, 140, 140, { rx: 36, fill: c })
        if (i === 0) b.ellipse(x + 34, y + 34, 72, 72, { fill: '#ffffff' })
        else if (i === 1) b.rect(x + 34, y + 34, 72, 72, { rx: 14, fill: '#ffffff' })
        else if (i === 2)
          b.path([point(x + 30, y + 110), point(x + 60, y + 34), point(x + 110, y + 110)], {
            closed: true,
            fill: '#ffffff'
          })
        else b.ellipse(x + 44, y + 44, 52, 52, { fill: '#ffffff', opacity: 0.92 })
      }
      return b.graph
    }
  },
  {
    id: 'affiche-bauhaus',
    name: 'Affiche géométrique',
    edited: '2026-09-15T14:12:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      b.rect(0, 0, 600, 800, { fill: '#f5ede0' })
      b.rect(40, 40, 6, 720, { fill: '#1f1f1f' })
      b.rect(554, 40, 6, 720, { fill: '#1f1f1f' })
      b.rect(40, 40, 520, 6, { fill: '#1f1f1f' })
      b.rect(40, 754, 520, 6, { fill: '#1f1f1f' })
      b.ellipse(110, 430, 280, 280, { fill: '#e3422d' })
      b.rect(340, 480, 220, 220, { fill: '#2258a6' })
      b.path([point(80, 150), point(240, 150), point(160, 330)], { closed: true, fill: '#f2c230' })
      b.ellipse(452, 130, 130, 130, { fill: '#1f1f1f' })
      b.ellipse(452, 690, 90, 90, { stroke: '#1f1f1f', strokeWidth: 8 })
      return b.graph
    }
  },
  {
    id: 'vague-bezier',
    name: 'Vague dynamique',
    edited: '2026-09-14T08:55:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      b.rect(0, 0, 720, 420, { fill: '#eef4ff' })
      b.path(
        [
          point(40, 360, [240, 400]),
          point(360, 180, [120, 150], [540, 210]),
          point(680, 340, [440, 300])
        ],
        { closed: false, stroke: '#0d99ff', strokeWidth: 14 }
      )
      b.path(
        [point(40, 360, [240, 470]), point(360, 250, [120, 220], [540, 280]), point(680, 340)],
        { closed: true, fill: '#0d99ff', opacity: 0.35 }
      )
      b.ellipse(340, 150, 40, 40, { fill: '#ffffff', stroke: '#0d99ff', strokeWidth: 6 })
      return b.graph
    }
  },
  {
    id: 'etoile-formes',
    name: 'Étoiles & triangles',
    edited: '2026-09-13T20:30:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      b.rect(0, 0, 500, 400, { fill: '#1a1b1f' })
      b.path(star(160, 180, 110, 48), { closed: true, fill: '#ffd166' })
      b.path(star(340, 120, 55, 24), { closed: true, fill: '#ef476f' })
      b.path(star(360, 300, 80, 34), { closed: true, fill: '#06d6a0' })
      b.path([point(70, 320), point(120, 240), point(170, 320)], { closed: true, fill: '#118ab2' })
      return b.graph
    }
  },
  {
    id: 'carte-visite',
    name: 'Carte de visite',
    edited: '2026-09-12T11:05:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      b.rect(40, 60, 520, 320, { rx: 14, fill: '#ffffff', stroke: '#e6e6e6', strokeWidth: 2 })
      b.rect(40, 60, 160, 320, { rx: 14, fill: '#0d99ff' })
      b.rect(238, 140, 240, 14, { rx: 7, fill: '#1f1f1f' })
      b.rect(238, 170, 160, 8, { rx: 4, fill: '#a0a4ab' })
      b.rect(238, 200, 190, 8, { rx: 4, fill: '#c6c9cd' })
      b.rect(238, 320, 130, 26, { rx: 13, fill: '#0d99ff' })
      b.ellipse(150, 200, 56, 56, { fill: '#ffffff', opacity: 0.9 })
      return b.graph
    }
  },
  {
    id: 'controles-ui',
    name: 'Boutons & contrôles UI',
    edited: '2026-09-11T16:48:00Z',
    createScene: () => {
      const b = new SceneBuilder()
      b.rect(0, 0, 560, 460, { fill: '#f5f6f8' })
      b.rect(60, 60, 200, 54, { rx: 12, fill: '#0d99ff' })
      b.rect(60, 134, 200, 54, { rx: 12, fill: '#ffffff', stroke: '#0d99ff', strokeWidth: 2 })
      b.rect(60, 208, 200, 54, { rx: 12, fill: '#eef4ff' })
      b.rect(60, 292, 60, 60, { rx: 16, fill: '#7c3aed' })
      b.rect(132, 292, 60, 60, { rx: 16, fill: '#ec4899' })
      b.rect(204, 292, 60, 60, { rx: 16, fill: '#10b981' })
      b.rect(314, 60, 14, 54, { rx: 7, fill: '#d0d4da' })
      b.rect(328, 60, 152, 54, { rx: 12, fill: '#ffffff', stroke: '#e2e4e8', strokeWidth: 2 })
      b.rect(328, 96, 116, 4, { rx: 2, fill: '#0d99ff' })
      b.rect(60, 370, 420, 8, { rx: 4, fill: '#e3e5e9' })
      b.ellipse(60, 370, 28, 28, { fill: '#ffffff', stroke: '#0d99ff', strokeWidth: 4 })
      return b.graph
    }
  }
]

export function findDemoProject(id: string): DemoProject | undefined {
  return DEMO_PROJECTS.find((p) => p.id === id)
}