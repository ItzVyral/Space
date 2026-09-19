<script lang="ts">
  interface Props {
    vertical?: boolean
  }

  let { vertical = false }: Props = $props()
</script>

<div class="divider" class:vertical role="separator"></div>

<style>
  .divider {
    height: 1px;
    background: var(--border);
  }
  .vertical {
    height: auto;
    width: 1px;
    align-self: stretch;
    flex-shrink: 0;
  }
</style>