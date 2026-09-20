import type { Vec2 } from '../geometry/vec'
import { identityTransform } from './Transform'
import type { Transform } from './Transform'

export type NodeType = 'path' | 'rect' | 'ellipse' | 'text' | 'group'
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay'
export type AnchorType = 'corner' | 'smooth' | 'symmetric'

export interface Paint {
  type: 'solid'
  color: string
  opacity: number
}

export interface StrokeStyle {
  color: string
  width: number
  opacity: number
  dash?: number[]
  lineCap?: 'butt' | 'round' | 'square'
  lineJoin?: 'miter' | 'round' | 'bevel'
}

export interface AnchorPoint {
  position: Vec2
  handleIn: Vec2 | null
  handleOut: Vec2 | null
  type: AnchorType
}

export interface SceneNode {
  id: string
  type: NodeType
  name: string
  transform: Transform
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  fill: Paint | null
  stroke: StrokeStyle | null
  parentId: string | null
  children: string[]
}

export interface PathNode extends SceneNode {
  type: 'path'
  points: AnchorPoint[]
  closed: boolean
}

export interface RectNode extends SceneNode {
  type: 'rect'
  width: number
  height: number
  rx?: number
  ry?: number
}

export interface EllipseNode extends SceneNode {
  type: 'ellipse'
  width: number
  height: number
}

export interface TextNode extends SceneNode {
  type: 'text'
}

export interface GroupNode extends SceneNode {
  type: 'group'
}

export type AnyNode = PathNode | RectNode | EllipseNode | TextNode | GroupNode

export const DEFAULT_FILL: Paint = { type: 'solid', color: '#d9dde3', opacity: 1 }
export const DEFAULT_STROKE: StrokeStyle = { color: '#1d1d1f', width: 1, opacity: 1 }

function baseNode(id: string, type: NodeType, name: string): SceneNode {
  return {
    id,
    type,
    name,
    transform: identityTransform(),
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    fill: null,
    stroke: null,
    parentId: null,
    children: []
  }
}

export function createRectNode(
  id: string,
  options: { width: number; height: number; rx?: number; ry?: number; name?: string }
): RectNode {
  return {
    ...baseNode(id, 'rect', options.name ?? 'Rectangle'),
    width: options.width,
    height: options.height,
    rx: options.rx,
    ry: options.ry
  } as RectNode
}

export function createEllipseNode(
  id: string,
  options: { width: number; height: number; name?: string }
): EllipseNode {
  return {
    ...baseNode(id, 'ellipse', options.name ?? 'Ellipse'),
    width: options.width,
    height: options.height
  } as EllipseNode
}

export function createPathNode(
  id: string,
  options: { points?: AnchorPoint[]; closed?: boolean; name?: string } = {}
): PathNode {
  return {
    ...baseNode(id, 'path', options.name ?? 'Chemin'),
    points: options.points ?? [],
    closed: options.closed ?? false
  } as PathNode
}

export function createTextNode(id: string, name?: string): TextNode {
  return { ...baseNode(id, 'text', name ?? 'Texte') } as TextNode
}

export function createGroupNode(id: string, name?: string): GroupNode {
  return { ...baseNode(id, 'group', name ?? 'Groupe') } as GroupNode
}