<script lang="ts">
  import { sceneGraph } from '../../stores/scene.store'
  import { selection } from '../../stores/selection.store'
  import { viewport } from '../../stores/viewport.store'
  import { drawPreview, marquee, type WorldRect } from '../../stores/interaction.store'
  import { worldToScreen } from '../../core/viewport/Viewport'
  import { nodeBounds } from '../../demo/scene-view'

  interface ScreenBox {
    id: string
    left: number
    top: number
    width: number
    height: number
  }

  function toScreenRect(rect: WorldRect) {
    const topLeft = worldToScreen($viewport, rect.x, rect.y)
    const bottomRight = worldToScreen($viewport, rect.x + rect.w, rect.y + rect.h)
    return {
      left: topLeft.x,
      top: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    }
  }

  const boxes = $derived(
    [...$selection].flatMap((id) => {
      const node = $sceneGraph.getNode(id)
      const bounds = node ? nodeBounds(node) : null
      if (!node || !bounds || !node.visible) return []
      const topLeft = worldToScreen($viewport, bounds.x, bounds.y)
      const bottomRight = worldToScreen($viewport, bounds.x + bounds.w, bounds.y + bounds.h)
      const box: ScreenBox = {
        id,
        left: topLeft.x,
        top: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y
      }
      return [box]
    })
  )

  const marqueeBox = $derived($marquee ? toScreenRect($marquee) : null)
  const drawBox = $derived($drawPreview ? toScreenRect($drawPreview.rect) : null)
</script>

<div class="selection-overlay" aria-hidden="true">
  {#each boxes as box (box.id)}
    <div class="box" style="left:{box.left}px; top:{box.top}px; width:{box.width}px; height:{box.height}px;"></div>
  {/each}

  {#if marqueeBox}
    <div
      class="marquee"
      style="left:{marqueeBox.left}px; top:{marqueeBox.top}px; width:{marqueeBox.width}px; height:{marqueeBox.height}px;"
    ></div>
  {/if}

  {#if drawBox && $drawPreview}
    <div
      class="preview"
      class:preview-ellipse={$drawPreview.type === 'ellipse'}
      style="left:{drawBox.left}px; top:{drawBox.top}px; width:{drawBox.width}px; height:{drawBox.height}px;"
    ></div>
  {/if}
</div>

<style>
  .selection-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .box {
    position: absolute;
    box-sizing: border-box;
    border: 1.5px solid var(--selection);
    background: var(--selection-soft);
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.6);
  }
  .marquee {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid var(--selection);
    background: var(--selection-soft);
  }
  .preview {
    position: absolute;
    box-sizing: border-box;
    border: 1.5px solid var(--selection);
    background: var(--selection-soft);
  }
  .preview-ellipse {
    border-radius: 50%;
  }
</style>
