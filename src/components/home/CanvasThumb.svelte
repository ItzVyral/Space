<script lang="ts">
  import { onMount } from 'svelte'
  import { Canvas2DRenderer } from '../../core/render/Canvas2DRenderer'
  import { fitViewport } from '../../demo/scene-view'
  import type { SceneGraph } from '../../core/scene/SceneGraph'

  interface Props {
    scene: () => SceneGraph
    width?: number
    height?: number
    dpr?: number
  }

  let { scene, width = 340, height = 200, dpr = 2 }: Props = $props()
  let canvasEl: HTMLCanvasElement

  onMount(() => {
    const renderer = new Canvas2DRenderer(canvasEl)
    renderer.setSize(width, height, dpr)
    const graph = scene()
    const fit = fitViewport(graph, width, height, 24)
    renderer.render(graph, fit)
  })
</script>

<canvas bind:this={canvasEl} width={width * dpr} height={height * dpr}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>