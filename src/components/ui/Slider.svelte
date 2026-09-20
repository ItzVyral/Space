<script lang="ts">
  interface Props {
    min?: number
    max?: number
    step?: number
    value: number
    onchange: (value: number) => void
    label?: string
  }

  let { min = 0, max = 100, step = 1, value, onchange, label = 'réglage' }: Props = $props()
</script>

<div class="slider-row">
  <input
    class="slider"
    type="range"
    {min}
    {max}
    {step}
    value={value}
    style="--fill:{((value - min) / (max - min)) * 100}%"
    oninput={(e) => onchange(Number((e.currentTarget as HTMLInputElement).value))}
    aria-label={label}
  />
</div>

<style>
  .slider-row {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(
      to right,
      var(--accent) 0%,
      var(--accent) var(--fill, 0%),
      var(--border-strong) var(--fill, 0%),
      var(--border-strong) 100%
    );
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--bg-raised);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-sm);
  }
  .slider:focus-visible {
    outline: none;
  }
  .slider:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>