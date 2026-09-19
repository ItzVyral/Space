<script lang="ts">
  import { onMount } from 'svelte'
  import Popup from './Popup.svelte'
  import Slider from './Slider.svelte'
  import { ChevronDown } from '@lucide/svelte'
  import Icon from './Icon.svelte'
  import {
    clamp,
    hexToHsv,
    hsvToHex,
    hsvToRgb,
    rgbToHex,
    hexToRgb,
    withAlpha
  } from '../../lib/color'

  interface Props {
    value: string
    opacity?: number
    onchange: (hex: string, opacity: number) => void
    showOpacity?: boolean
  }

  let { value, opacity = 1, onchange, showOpacity = true }: Props = $props()

  interface Draft {
    h: number
    s: number
    v: number
    opacity: number
  }

  let draft = $state<Draft>({ h: 0, s: 0, v: 1, opacity: 1 })
  let dragging = $state<'sv' | 'hue' | null>(null)
  let svCanvas: HTMLCanvasElement
  let hueCanvas: HTMLCanvasElement

  const svW = 260
  const svH = 150

  let draftHex = $derived(hsvToHex(draft.h, draft.s, draft.v))

  function syncDraft(): void {
    const hsv = hexToHsv(value)
    draft = { h: hsv.h, s: hsv.s, v: hsv.v, opacity }
  }

  function begin(e: PointerEvent, area: 'sv' | 'hue'): void {
    const canvas = area === 'sv' ? svCanvas : hueCanvas
    canvas.setPointerCapture(e.pointerId)
    dragging = area
    move(e, area)
    e.preventDefault()
  }

  function move(e: PointerEvent, area: 'sv' | 'hue'): void {
    if (dragging !== area) return
    const canvas = area === 'sv' ? svCanvas : hueCanvas
    const rect = canvas.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1)
    if (area === 'sv') {
      draft = { ...draft, s: x, v: 1 - y }
    } else {
      draft = { ...draft, h: x * 360 }
    }
    commit()
  }

  function end(): void {
    dragging = null
  }

  function commit(): void {
    onchange(hsvToHex(draft.h, draft.s, draft.v), draft.opacity)
  }

  function commitHex(raw: string): void {
    const { r, g, b } = hexToRgb(raw)
    const hex = rgbToHex(r, g, b)
    const hsv = hexToHsv(hex)
    draft = { ...draft, ...hsv }
    onchange(hex, draft.opacity)
  }

  function drawSV(): void {
    if (!svCanvas) return
    const g = svCanvas.getContext('2d')
    if (!g) return
    const base = hsvToRgb(draft.h, 1, 1)
    const white = g.createLinearGradient(0, 0, svW, 0)
    white.addColorStop(0, '#ffffff')
    white.addColorStop(1, `rgb(${base.r | 0}, ${base.g | 0}, ${base.b | 0})`)
    g.fillStyle = white
    g.fillRect(0, 0, svW, svH)
    const black = g.createLinearGradient(0, 0, 0, svH)
    black.addColorStop(0, 'rgba(0,0,0,0)')
    black.addColorStop(1, 'rgba(0,0,0,1)')
    g.fillStyle = black
    g.fillRect(0, 0, svW, svH)

    const px = clamp(draft.s, 0, 1) * svW
    const py = (1 - clamp(draft.v, 0, 1)) * svH
    g.beginPath()
    g.arc(px, py, 7, 0, Math.PI * 2)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2
    g.stroke()
    g.beginPath()
    g.arc(px, py, 3.5, 0, Math.PI * 2)
    g.fillStyle = '#ffffff'
    g.fill()
  }

  function drawHue(): void {
    if (!hueCanvas) return
    const g = hueCanvas.getContext('2d')
    if (!g) return
    const stops = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000']
    const grad = g.createLinearGradient(0, 0, hueCanvas.width, 0)
    stops.forEach((stop, index) => {
      grad.addColorStop(index / (stops.length - 1), stop)
    })
    g.fillStyle = grad
    g.fillRect(0, 0, hueCanvas.width, hueCanvas.height)
    const hx = (draft.h / 360) * hueCanvas.width
    g.beginPath()
    g.arc(hx, hueCanvas.height / 2, 6, 0, Math.PI * 2)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2
    g.stroke()
  }

  $effect(() => {
    drawSV()
    drawHue()
  })

  onMount(() => drawSV())
</script>

<Popup align="start">
  {#snippet trigger({ open, toggle })}
    <button
      type="button"
      class="color-btn"
      onclick={() => {
        toggle()
        if (!open) syncDraft()
      }}
    >
      <span class="color-swatch">
        <span class="checker"></span>
        <span class="fill" style="background: {withAlpha(value, opacity)}"></span>
      </span>
      <span class="hex">{value.toUpperCase()}</span>
      <Icon name={ChevronDown} size={12} strokeWidth={2} color="var(--text-tertiary)" />
    </button>
  {/snippet}
  {#snippet content()}
    <div class="picker">
      <canvas
        bind:this={svCanvas}
        width={svW}
        height={svH}
        class="sv-area"
        role="slider"
        aria-label="Couleur"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Number(draft.v.toFixed(2))}
        onpointerdown={(e) => begin(e, 'sv')}
        onpointermove={(e) => move(e, 'sv')}
        onpointerup={end}
        onpointercancel={end}
      ></canvas>
      <canvas
        bind:this={hueCanvas}
        width={svW}
        height={14}
        class="hue-area"
        role="slider"
        aria-label="Teinte"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(draft.h)}
        onpointerdown={(e) => begin(e, 'hue')}
        onpointermove={(e) => move(e, 'hue')}
        onpointerup={end}
        onpointercancel={end}
      ></canvas>
      <div class="row">
        <span class="hex-label">#</span>
        <input
          class="hex-input"
          value={draftHex.slice(1)}
          maxlength="6"
          spellcheck="false"
          aria-label="Code couleur hexadécimal"
          onchange={(e) => commitHex((e.currentTarget as HTMLInputElement).value)}
        />
        {#if showOpacity}
          <div class="opacity">
            <Slider
              label="Opacité"
              min={0}
              max={100}
              value={Math.round(draft.opacity * 100)}
              onchange={(v) => {
                draft = { ...draft, opacity: v / 100 }
                commit()
              }}
            />
            <span class="opacity-num">{Math.round(draft.opacity * 100)}</span>
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
</Popup>

<style>
  .color-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 26px;
    padding: 0 7px 0 4px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border);
    background: var(--bg-subtle);
    transition: border-color 100ms ease;
    min-width: 0;
  }
  .color-btn:hover {
    border-color: var(--border-strong);
  }
  .color-swatch {
    position: relative;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border);
    flex-shrink: 0;
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
  .hex {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text);
    letter-spacing: 0.2px;
  }

  .picker {
    width: 260px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .sv-area {
    width: 100%;
    height: 150px;
    border-radius: var(--radius-sm);
    cursor: crosshair;
    touch-action: none;
  }
  .hue-area {
    width: 100%;
    height: 14px;
    border-radius: 7px;
    cursor: pointer;
    touch-action: none;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .hex-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }
  .hex-input {
    width: 64px;
    padding: 4px 6px;
    font-family: var(--font-mono);
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    background: var(--bg-subtle);
    text-transform: uppercase;
  }
  .hex-input:focus {
    border-color: var(--accent);
  }
  .opacity {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .opacity-num {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    width: 22px;
    text-align: right;
  }
</style>