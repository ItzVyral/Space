<script lang="ts">
  interface Props {
    value: string | number
    label?: string
    unit?: string
    kind?: 'text' | 'number'
    step?: number
    placeholder?: string
    onchange: (value: string) => void
  }

  let {
    value,
    label,
    unit,
    kind = 'text',
    step = 1,
    placeholder = '',
    onchange
  }: Props = $props()

  let instances = 0
  const inputId = `field-${++instances}`

  function commit(e: Event): void {
    const input = e.currentTarget as HTMLInputElement
    onchange(input.value)
  }
</script>

<div class="field" class:with-label={!!label}>
  {#if label}<label class="field-label" for={inputId}>{label}</label>{/if}
  <div class="input-wrap">
    <input
      id={inputId}
      type={kind === 'number' ? 'number' : 'text'}
      {step}
      {placeholder}
      value={value}
      aria-label={label ?? 'valeur'}
      onchange={commit}
      spellcheck="false"
    />
    {#if unit}<span class="unit">{unit}</span>{/if}
  </div>
</div>

<style>
  .field {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .field-label {
    flex: 1;
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .input-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 6px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    transition: border-color 100ms ease;
    min-width: 0;
  }
  .input-wrap:focus-within {
    border-color: var(--accent);
  }
  .input-wrap input {
    width: 100%;
    min-width: 0;
    height: 100%;
    font-size: 12px;
    color: var(--text);
    text-align: right;
    background: transparent;
  }
  .input-wrap input[type='number']::-webkit-inner-spin-button,
  .input-wrap input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .input-wrap input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .unit {
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
</style>