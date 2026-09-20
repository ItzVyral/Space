<script lang="ts">
  import CanvasViewport from './CanvasViewport.svelte'
  import SelectionOverlay from './SelectionOverlay.svelte'
  import ZoomBar from './ZoomBar.svelte'

  let stageEl: HTMLDivElement
  let stageSize = $state({ width: 0, height: 0 })

  $effect(() => {
    if (!stageEl) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      stageSize = { width: entry.contentRect.width, height: entry.contentRect.height }
    })
    observer.observe(stageEl)
    const rect = stageEl.getBoundingClientRect()
    stageSize = { width: rect.width, height: rect.height }
    return () => observer.disconnect()
  })
</script>

<div bind:this={stageEl} class="stage">
  <CanvasViewport />
  <SelectionOverlay />
  <ZoomBar width={stageSize.width} height={stageSize.height} />
</div>

<style>
  .stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--canvas);
  }
</style>