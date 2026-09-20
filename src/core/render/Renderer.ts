import type { SceneGraph } from '../scene/SceneGraph'
import type { Viewport } from '../viewport/Viewport'

export interface Renderer {
  setSize(width: number, height: number, dpr: number): void
  render(scene: SceneGraph, viewport: Viewport): void
}