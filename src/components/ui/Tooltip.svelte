<script lang="ts">
  interface Props {
    label: string
    shortcut?: string
    position?: 'top' | 'bottom' | 'left' | 'right'
    children?: import('svelte').Snippet
  }

  let { label, shortcut, position = 'bottom', children }: Props = $props()
</script>

<span class="tooltip-host" data-position={position}>
  {@render children?.()}
  <span class="tooltip" role="tooltip">
    {label}
    {#if shortcut}<span class="kbd">{shortcut}</span>{/if}
  </span>
</span>

<style>
  .tooltip-host {
    position: relative;
    display: inline-flex;
  }
  .tooltip {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-tooltip);
    background: var(--surface-tooltip);
    color: var(--text-tooltip);
    font-size: 11px;
    font-weight: 500;
    padding: 5px 9px;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-tooltip);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition:
      opacity 120ms ease 250ms,
      transform 120ms ease 250ms;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tooltip-host:hover .tooltip,
  .tooltip-host:focus-within .tooltip {
    opacity: 1;
    transition-delay: 550ms;
  }
  [data-position='top'] .tooltip {
    left: 50%;
    bottom: calc(100% + 7px);
    transform: translateX(-50%) translateY(2px);
  }
  [data-position='bottom'] .tooltip {
    left: 50%;
    top: calc(100% + 7px);
    transform: translateX(-50%) translateY(-2px);
  }
  [data-position='left'] .tooltip {
    right: calc(100% + 7px);
    top: 50%;
    transform: translateY(-50%) translateX(2px);
  }
  [data-position='right'] .tooltip {
    left: calc(100% + 7px);
    top: 50%;
    transform: translateY(-50%) translateX(-2px);
  }
  .tooltip-host[data-position='top']:hover .tooltip,
  .tooltip-host[data-position='top']:focus-within .tooltip,
  .tooltip-host[data-position='bottom']:hover .tooltip,
  .tooltip-host[data-position='bottom']:focus-within .tooltip {
    transform: translateX(-50%) translateY(0);
  }
  .tooltip-host[data-position='left']:hover .tooltip,
  .tooltip-host[data-position='left']:focus-within .tooltip,
  .tooltip-host[data-position='right']:hover .tooltip,
  .tooltip-host[data-position='right']:focus-within .tooltip {
    transform: translateY(-50%) translateX(0);
  }
  .kbd {
    opacity: 0.72;
    font-size: 10px;
    letter-spacing: 0.3px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(128, 128, 128, 0.22);
  }
</style>