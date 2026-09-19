import type { SceneGraph } from '../scene/SceneGraph'
import type { AnyNode, EllipseNode, PathNode, RectNode } from '../scene/SceneNode'
import type { Viewport } from '../viewport/Viewport'

const DEFAULT_BACKGROUND = '#f1f2f4'

export class Canvas2DRenderer {
  private readonly ctx: CanvasRenderingContext2D
  private dpr = 1
  private background = DEFAULT_BACKGROUND

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Contexte Canvas 2D indisponible')
    }
    this.ctx = ctx
  }

  setSize(width: number, height: number, dpr: number): void {
    this.dpr = dpr
    this.canvas.width = Math.max(1, Math.round(width * dpr))
    this.canvas.height = Math.max(1, Math.round(height * dpr))
  }

  setBackground(color: string): void {
    this.background = color
  }

  render(scene: SceneGraph, viewport: Viewport): void {
    const { ctx, dpr } = this
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.drawBackground()
    ctx.setTransform(dpr * viewport.zoom, 0, 0, dpr * viewport.zoom, dpr * viewport.x, dpr * viewport.y)
    scene.walk((node) => this.drawNode(node))
  }

  private drawBackground(): void {
    const { ctx } = this
    ctx.fillStyle = this.background
    ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr)
  }

  private drawNode(node: AnyNode): void {
    if (!node.visible || node.type === 'group' || node.type === 'text') return
    const { ctx } = this
    const t = node.transform
    ctx.save()
    ctx.globalAlpha = node.opacity
    ctx.transform(t.m00, t.m10, t.m01, t.m11, t.m02, t.m12)
    this.traceGeometry(node)
    if (node.fill) {
      ctx.fillStyle = node.fill.color
      ctx.fill()
    }
    if (node.stroke) {
      ctx.strokeStyle = node.stroke.color
      ctx.lineWidth = node.stroke.width
      ctx.lineCap = node.stroke.lineCap ?? 'butt'
      ctx.lineJoin = node.stroke.lineJoin ?? 'miter'
      ctx.setLineDash(node.stroke.dash ?? [])
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
  }

  private traceGeometry(node: RectNode | EllipseNode | PathNode): void {
    const { ctx } = this
    ctx.beginPath()
    if (node.type === 'rect') {
      const rx = node.rx ?? 0
      const ry = node.ry ?? rx
      if (rx > 0 || ry > 0) {
        ctx.roundRect(0, 0, node.width, node.height, [rx, ry])
      } else {
        ctx.rect(0, 0, node.width, node.height)
      }
    } else if (node.type === 'ellipse') {
      ctx.ellipse(node.width / 2, node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2)
    } else {
      this.tracePath(node)
    }
  }

  private tracePath(node: PathNode): void {
    const { ctx } = this
    const points = node.points
    if (points.length === 0) {
      ctx.closePath()
      return
    }
    const first = points[0]!
    ctx.moveTo(first.position.x, first.position.y)
    for (let i = 1; i < points.length; i++) {
      this.traceSegment(points[i - 1]!, points[i]!)
    }
    if (node.closed && points.length > 1) {
      this.traceSegment(points[points.length - 1]!, first)
    }
    if (node.closed) ctx.closePath()
  }

  private traceSegment(from: PathNode['points'][number], to: PathNode['points'][number]): void {
    const { ctx } = this
    const hasIn = to.handleIn !== null
    const hasOut = from.handleOut !== null
    if (hasOut && hasIn) {
      ctx.bezierCurveTo(
        from.handleOut!.x,
        from.handleOut!.y,
        to.handleIn!.x,
        to.handleIn!.y,
        to.position.x,
        to.position.y
      )
    } else if (hasOut) {
      ctx.quadraticCurveTo(from.handleOut!.x, from.handleOut!.y, to.position.x, to.position.y)
    } else if (hasIn) {
      ctx.quadraticCurveTo(to.handleIn!.x, to.handleIn!.y, to.position.x, to.position.y)
    } else {
      ctx.lineTo(to.position.x, to.position.y)
    }
  }
}