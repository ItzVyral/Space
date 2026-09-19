<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'
  import { get } from 'svelte/store'
  import { Canvas2DRenderer } from '../../core/render/Canvas2DRenderer'
  import { defaultViewport, zoomAt, screenToWorld } from '../../core/viewport/Viewport'
  import { createEllipse, createRect, sceneGraph, setNodeTranslation } from '../../stores/scene-actions'
  import { viewport } from '../../stores/viewport.store'
  import {
    clearSelection,
    selectOnly,
    selection,
    toggleInSelection
  } from '../../stores/selection.store'
  import { activeTool, setTool } from '../../stores/tool.store'
  import {
    drawPreview,
    marquee,
    type WorldRect
  } from '../../stores/interaction.store'
  import { hitTest, nodesInRect, normalizeRect } from '../../demo/scene-view'
  import type { Vec2 } from '../../core/geometry/vec'

  type DragState =
    | { kind: 'idle' }
    | { kind: 'pan'; lastX: number; lastY: number }
    | { kind: 'move'; start: Vec2; moved: boolean; session: number; initial: Map<string, Vec2> }
    | { kind: 'marquee'; start: Vec2; base: ReadonlySet<string> }
    | { kind: 'draw'; type: 'rect' | 'ellipse'; start: Vec2 }

  let canvasEl: HTMLCanvasElement
  let renderer: Canvas2DRenderer | null = null
  let drag = $state<DragState>({ kind: 'idle' })
  let spaceHeld = $state(false)
  let moveSession = 0

  const isShapeTool = $derived($activeTool === 'rect' || $activeTool === 'ellipse')
  const cursor = $derived.by(() => {
    if ($activeTool === 'hand') return 'grab'
    if (isShapeTool) return 'crosshair'
    return 'default'
  })

  function applySize(): void {
    const dpr = window.devicePixelRatio || 1
    renderer?.setSize(canvasEl.clientWidth, canvasEl.clientHeight, dpr)
  }

  function applyBackground(): void {
    const style = getComputedStyle(document.documentElement)
    renderer?.setBackground((style.getPropertyValue('--canvas') || '#f1f2f4').trim())
  }

  function handleWheel(e: WheelEvent): void {
    const factor = Math.exp(-e.deltaY * 0.0016)
    viewport.update((v) => zoomAt(v, e.offsetX, e.offsetY, factor))
  }

  function screenToWorldPoint(e: { clientX: number; clientY: number }): Vec2 {
    const rect = canvasEl.getBoundingClientRect()
    return screenToWorld($viewport, e.clientX - rect.left, e.clientY - rect.top)
  }

  function capture(e: PointerEvent): void {
    canvasEl.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function startPointer(e: PointerEvent): void {
    const world = screenToWorldPoint(e)
    const wantsPan =
      e.button === 1 || $activeTool === 'hand' || (e.button === 0 && spaceHeld)

    if (wantsPan) {
      drag = { kind: 'pan', lastX: e.clientX, lastY: e.clientY }
      capture(e)
      return
    }
    if (e.button !== 0) return

    if (isShapeTool) {
      const type = $activeTool === 'rect' ? 'rect' : 'ellipse'
      drag = { kind: 'draw', type, start: world }
      drawPreview.set({ type, rect: { x: world.x, y: world.y, w: 0, h: 0 } })
      capture(e)
      return
    }

    const hit = hitTest($sceneGraph, world.x, world.y)
    if (hit) {
      if (e.shiftKey) {
        const nowSelected = toggleInSelection(hit)
        if (!nowSelected) return
      } else if (!$selection.has(hit)) {
        selectOnly([hit])
      }
      const initial = new SvelteMap<string, Vec2>()
      for (const id of get(selection)) {
        const node = $sceneGraph.getNode(id)
        if (node && !node.locked) {
          initial.set(id, { x: node.transform.m02, y: node.transform.m12 })
        }
      }
      moveSession += 1
      drag = { kind: 'move', start: world, moved: false, session: moveSession, initial }
      capture(e)
      return
    }

    const base = e.shiftKey ? new SvelteSet(get(selection)) : new SvelteSet<string>()
    if (!e.shiftKey) clearSelection()
    drag = { kind: 'marquee', start: world, base }
    marquee.set({ x: world.x, y: world.y, w: 0, h: 0 })
    capture(e)
  }

  function updatePointer(e: PointerEvent): void {
    if (drag.kind === 'idle') return
    const world = screenToWorldPoint(e)

    if (drag.kind === 'pan') {
      const dx = e.clientX - drag.lastX
      const dy = e.clientY - drag.lastY
      drag.lastX = e.clientX
      drag.lastY = e.clientY
      viewport.update((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
      return
    }

    if (drag.kind === 'move') {
      const dx = world.x - drag.start.x
      const dy = world.y - drag.start.y
      if (!drag.moved && Math.hypot(dx, dy) * $viewport.zoom < 3) return
      drag.moved = true
      const key = `move:${drag.session}`
      for (const [id, start] of drag.initial) {
        setNodeTranslation(id, start.x + dx, start.y + dy, key)
      }
      return
    }

    if (drag.kind === 'marquee') {
      marquee.set(normalizeRect(drag.start.x, drag.start.y, world.x, world.y))
      return
    }

    if (drag.kind === 'draw') {
      const rect = normalizedDrawRect(drag, world, e.shiftKey)
      drawPreview.set({ type: drag.type, rect })
    }
  }

  function stopPointer(e: PointerEvent): void {
    const finished = drag
    drag = { kind: 'idle' }
    if (finished.kind === 'idle') return
    canvasEl.releasePointerCapture(e.pointerId)

    if (finished.kind === 'marquee') {
      const world = screenToWorldPoint(e)
      const rect = normalizeRect(finished.start.x, finished.start.y, world.x, world.y)
      const hits = nodesInRect($sceneGraph, rect)
      const next = new SvelteSet(finished.base)
      for (const id of hits) next.add(id)
      selection.set(next)
      marquee.set(null)
      return
    }

    if (finished.kind === 'draw') {
      drawPreview.set(null)
      const world = screenToWorldPoint(e)
      const rect = normalizedDrawRect(finished, world, e.shiftKey)
      if (rect.w < 1 || rect.h < 1) return
      const id =
        finished.type === 'rect'
          ? createRect(rect.x, rect.y, rect.w, rect.h)
          : createEllipse(rect.x, rect.y, rect.w, rect.h)
      selectOnly([id])
      setTool('move')
    }
  }

  function normalizedDrawRect(
    state: Extract<DragState, { kind: 'draw' }>,
    world: Vec2,
    square: boolean
  ): WorldRect {
    let endX = world.x
    let endY = world.y
    if (square) {
      const size = Math.max(Math.abs(endX - state.start.x), Math.abs(endY - state.start.y))
      endX = state.start.x + size * Math.sign(endX - state.start.x || 1)
      endY = state.start.y + size * Math.sign(endY - state.start.y || 1)
    }
    const rect = normalizeRect(state.start.x, state.start.y, endX, endY)
    return { x: rect.x, y: rect.y, w: rect.w, h: rect.h }
  }

  function resetView(): void {
    viewport.set(defaultViewport())
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.key === ' ') {
        spaceHeld = true
        e.preventDefault()
        return
      }
      e.preventDefault()
      resetView()
    }
    if (e.key === 'Escape' && $selection.size > 0) {
      clearSelection()
    }
  }

  function handleKeyup(e: KeyboardEvent): void {
    if (e.key === ' ') spaceHeld = false
  }

  onMount(() => {
    renderer = new Canvas2DRenderer(canvasEl)
    const resizeObserver = new ResizeObserver(applySize)
    resizeObserver.observe(canvasEl)
    canvasEl.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keyup', handleKeyup)
    applySize()
    applyBackground()
    renderer.render($sceneGraph, $viewport)
    return () => {
      resizeObserver.disconnect()
      canvasEl.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keyup', handleKeyup)
    }
  })

  $effect(() => {
    const current = $viewport
    const scene = $sceneGraph
    applyBackground()
    const raf = requestAnimationFrame(() => renderer?.render(scene, current))
    return () => cancelAnimationFrame(raf)
  })
</script>

<div class="viewport">
  <canvas
    bind:this={canvasEl}
    class="surface"
    style:cursor={cursor}
    aria-label="Zone de dessin Space"
    tabindex="0"
    onkeydown={handleKeydown}
    onpointerdown={startPointer}
    onpointermove={updatePointer}
    onpointerup={stopPointer}
    ondblclick={(e) => {
      const world = screenToWorldPoint(e)
      if ($activeTool === 'move' && hitTest($sceneGraph, world.x, world.y) === null) {
        resetView()
      }
    }}
  ></canvas>
  <p class="hint">
    Molette : zoom · Clic milieu / Espace : pan · Clic : sélectionner · Maj+clic : ajouter · Glisser : déplacer / sélectionner
  </p>
</div>

<style>
  .viewport {
    position: absolute;
    inset: 0;
  }
  .surface {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    outline: none;
  }
  .hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 6px 12px;
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(8px);
    pointer-events: none;
    white-space: nowrap;
  }
</style>
