<script lang="ts">
  interface Props {
    color: string
    selected?: boolean
    size?: number
    title?: string
    onclick?: (e: MouseEvent) => void
  }

  let { color, selected = false, size = 20, title, onclick }: Props = $props()
</script>

<button
  class="swatch"
  class:swatch-selected={selected}
  style="width: {size}px; height: {size}px; border-radius: {Math.max(4, Math.round(size / 4))}px;"
  {title}
  {onclick}
  type="button"
  aria-pressed={selected}
>
  <span class="checker"></span>
  <span class="fill" style="background: {color}"></span>
</button>

<style>
  .swatch {
    position: relative;
    flex-shrink: 0;
    border: 1px solid var(--border);
    overflow: hidden;
    transition:
      box-shadow 90ms ease,
      border-color 90ms ease;
  }
  .swatch:hover {
    border-color: var(--border-strong);
  }
  .swatch-selected,
  .swatch-selected:hover {
    box-shadow: 0 0 0 2px var(--accent);
    border-color: transparent;
  }
  .checker {
    position: absolute;
    inset: 0;
    background:
      conic-gradient(var(--text-tertiary) 25%, transparent 0 50%, var(--text-tertiary) 0 75%, transparent 0)
        0 0 / 7px 7px;
    opacity: 0.35;
  }
  .fill {
    position: absolute;
    inset: 0;
  }
</style>