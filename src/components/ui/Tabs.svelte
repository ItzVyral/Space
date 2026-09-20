<script lang="ts">
  interface Tab {
    id: string
    label: string
  }

  interface Props {
    tabs: Tab[]
    value: string
    onchange: (id: string) => void
  }

  let { tabs, value, onchange }: Props = $props()
</script>

<div class="tabs" role="tablist">
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class="tab"
      class:tab-active={value === tab.id}
      role="tab"
      aria-selected={value === tab.id}
      onclick={() => onchange(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 38px;
    padding: 0 16px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }
  .tab {
    position: relative;
    height: 100%;
    padding: 0 6px;
    font-size: 12px;
    color: var(--text-secondary);
    transition: color 90ms ease;
  }
  .tab:hover {
    color: var(--text);
  }
  .tab-active,
  .tab-active:hover {
    color: var(--text);
  }
  .tab-active::after {
    content: '';
    position: absolute;
    left: 6px;
    right: 6px;
    bottom: 0;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: var(--accent);
  }
</style>