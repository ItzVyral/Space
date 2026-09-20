<script lang="ts">
  import Tooltip from '../ui/Tooltip.svelte'
  import { viewport } from '../../stores/viewport.store'
  import { sceneGraph } from '../../stores/scene.store'
  import { zoomAt } from '../../core/viewport/Viewport'
  import { fitViewport } from '../../demo/scene-view'

  interface Props {
    width: number
    height: number
  }

  let { width, height }: Props = $props()

  const percent = $derived(Math.round($viewport.zoom * 100))

  function zoom(out: boolean): void {
    const factor = out ? 1 / 1.25 : 1.25
    viewport.update((v) => zoomAt(v, width / 2, height / 2, factor))
  }

  function fit(): void {
    const next = fitViewport($sceneGraph, width, height)
    if (next) viewport.set(next)
  }
</script>

<div class="zoombar">
  <button type="button" class="zbtn" onclick={() => zoom(true)} aria-label="Zoom arrière" title="Zoom arrière">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </button>
  <span class="percent" role="status">{percent}%</span>
  <button type="button" class="zbtn" onclick={() => zoom(false)} aria-label="Zoom avant" title="Zoom avant">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </button>
  <span class="divider"></span>
  <Tooltip label="Ajuster à l’écran" position="bottom">
    <button type="button" class="zbtn" onclick={fit} aria-label="Ajuster à l’écran">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
      </svg>
    </button>
  </Tooltip>
</div>

<style>
  .zoombar {
    position: absolute;
    left: 12px;
    bottom: 12px;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 34px;
    padding: 0 6px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(8px);
  }
  .zbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-xs);
    color: var(--text-secondary);
  }
  .zbtn:hover {
    background: var(--hover);
    color: var(--text);
  }
  .percent {
    min-width: 44px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .divider {
    width: 1px;
    height: 18px;
    background: var(--border);
    margin: 0 2px;
  }
</style>