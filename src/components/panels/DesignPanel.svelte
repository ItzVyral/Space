<script lang="ts">
  import Section from '../ui/Section.svelte'
  import Field from '../ui/Field.svelte'
  import Slider from '../ui/Slider.svelte'
  import Swatch from '../ui/Swatch.svelte'
  import Popup from '../ui/Popup.svelte'
  import ColorField from '../ui/ColorField.svelte'
  import Divider from '../ui/Divider.svelte'
  import Icon from '../ui/Icon.svelte'
  import Tooltip from '../ui/Tooltip.svelte'
  import { Lock, LockOpen, Plus, Minus } from '@lucide/svelte'
  import {
    mutateNode,
    mutateNodes,
    sceneGraph,
    toggleNodeLocked,
    setNodesFill,
    setNodesStroke,
    toggleNodesFill,
    toggleNodesStroke
  } from '../../stores/scene-actions'
  import { selection } from '../../stores/selection.store'
  import type { BlendMode } from '../../core/scene/SceneNode'

  const count = $derived($selection.size)
  const selectedId = $derived([...$selection][0])
  const node = $derived(selectedId ? $sceneGraph.getNode(selectedId) : undefined)
  const rectNode = $derived(
    node && (node.type === 'rect' || node.type === 'ellipse') ? node : null
  )

  function round(value: number): string {
    return String(Math.round(value * 100) / 100)
  }

  function setPosition(key: 'x' | 'y', raw: string): void {
    if (!node) return
    const value = Number(raw)
    if (!Number.isFinite(value)) return
    mutateNode(node.id, (n) => {
      n.transform = {
        ...n.transform,
        m02: key === 'x' ? value : n.transform.m02,
        m12: key === 'y' ? value : n.transform.m12
      }
    })
  }

  function setSize(key: 'w' | 'h', raw: string): void {
    if (!rectNode) return
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) return
    mutateNode(rectNode.id, (n) => {
      if (n.type === 'rect' || n.type === 'ellipse') {
        if (key === 'w') n.width = value
        else n.height = value
      }
    })
  }

  function setRadius(raw: string): void {
    if (!node || node.type !== 'rect') return
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) return
    mutateNode(node.id, (n) => {
      if (n.type === 'rect') {
        n.rx = value
        n.ry = value
      }
    })
  }

  function setFillColor(hex: string, opacity: number): void {
    if (!node) return
    mutateNode(node.id, (n) => {
      if (!n.fill) return
      n.fill.color = hex
      n.fill.opacity = opacity
    })
  }

  function setFillAlpha(raw: string): void {
    if (!node) return
    const value = Number(raw)
    if (!Number.isFinite(value)) return
    mutateNode(node.id, (n) => {
      if (!n.fill) return
      n.fill.opacity = Math.max(0, Math.min(1, value))
    })
  }

  function setFillHex(hex: string): void {
    if (!node) return
    mutateNode(node.id, (n) => {
      if (!n.fill) return
      n.fill.color = hex
    })
  }

  function setStrokeWidth(raw: string): void {
    if (!node) return
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) return
    mutateNode(node.id, (n) => {
      if (!n.stroke) return
      n.stroke.width = value
    })
  }

  function setStrokeColor(hex: string, opacity: number): void {
    if (!node) return
    mutateNode(node.id, (n) => {
      if (!n.stroke) return
      n.stroke.color = hex
      n.stroke.opacity = opacity
    })
  }

  function setOpacity(value: number): void {
    mutateNodes([...$selection], (n) => {
      n.opacity = value / 100
    }, 'Modifier l’opacité')
  }

  function setBlend(mode: BlendMode): void {
    mutateNodes([...$selection], (n) => {
      n.blendMode = mode
    }, 'Changer le mode de fusion')
  }
</script>

{#snippet fillTrigger({ toggle }: { toggle: () => void })}
  <span
    role="button"
    tabindex="0"
    class="fill-trigger"
    onclick={toggle}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      }
    }}
  >
    <Swatch color={node?.fill?.color ?? 'transparent'} selected />
  </span>
{/snippet}

{#snippet fillContent({ close }: { close: () => void })}
  <div class="color-pop">
    <ColorField
      value={node?.fill?.color ?? '#000000'}
      opacity={node?.fill?.opacity ?? 1}
      onchange={(hex, opacity) => {
        setFillColor(hex, opacity)
        close()
      }}
      showOpacity
    />
  </div>
{/snippet}

{#snippet strokeTrigger({ toggle }: { toggle: () => void })}
  <span
    role="button"
    tabindex="0"
    class="fill-trigger"
    onclick={toggle}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      }
    }}
  >
    <Swatch color={node?.stroke?.color ?? 'transparent'} />
  </span>
{/snippet}

{#snippet strokeContent({ close }: { close: () => void })}
  <div class="color-pop">
    <ColorField
      value={node?.stroke?.color ?? '#000000'}
      opacity={node?.stroke?.opacity ?? 1}
      onchange={(hex, opacity) => {
        setStrokeColor(hex, opacity)
        close()
      }}
      showOpacity
    />
  </div>
{/snippet}

<div class="panel">
  <div class="panel-head">
    <span class="panel-title">Design</span>
    {#if count === 1 && node}
      <Tooltip label={node.locked ? 'Déverrouiller' : 'Verrouiller'} position="bottom">
        <button
          type="button"
          class="head-action"
          class:head-action-on={node.locked}
          aria-label={node.locked ? 'Déverrouiller' : 'Verrouiller'}
          onclick={() => toggleNodeLocked(node.id)}
        >
          <Icon name={node.locked ? Lock : LockOpen} size={14} strokeWidth={1.8} />
        </button>
      </Tooltip>
    {/if}
  </div>

  {#if count === 0}
    <p class="empty">
      Sélectionnez un élément<br />dans le canvas ou les calques.
    </p>
  {:else if count > 1}
    <div class="list">
      <Section title="Sélection">
        <p class="multi">{count} éléments sélectionnés</p>
      </Section>
      <Section title="Opacité">
        <div class="fill-row">
          <Slider min={0} max={100} step={1} value={100} onchange={setOpacity} label="Opacité" />
        </div>
      </Section>
      <Section title="Fusion" defaultOpen={false}>
        <select
          class="blend"
          value="normal"
          onchange={(e) => setBlend((e.currentTarget as HTMLSelectElement).value as BlendMode)}
          aria-label="Mode de fusion"
        >
          <option value="normal">Normal</option>
          <option value="multiply">Produit</option>
          <option value="screen">Superposition</option>
          <option value="overlay">Incrustation</option>
        </select>
      </Section>
    </div>
  {:else if node}
    <div class="list">
      {#if rectNode}
        <Section title="Disposition">
          <div class="field-row">
            <Field
              label="x"
              kind="number"
              value={round(rectNode.transform.m02)}
              onchange={(v) => setPosition('x', v)}
            />
            <Field
              label="y"
              kind="number"
              value={round(rectNode.transform.m12)}
              onchange={(v) => setPosition('y', v)}
            />
          </div>
          <div class="field-row">
            <Field
              label="L"
              kind="number"
              value={round(rectNode.width)}
              onchange={(v) => setSize('w', v)}
            />
            <Field
              label="H"
              kind="number"
              value={round(rectNode.height)}
              onchange={(v) => setSize('h', v)}
            />
          </div>
          {#if rectNode.type === 'rect'}
            <div class="field-row">
              <Field
                label="Rayon"
                kind="number"
                value={round(rectNode.rx ?? 0)}
                onchange={setRadius}
              />
            </div>
          {/if}
        </Section>
      {/if}

      <Section title="Remplissage">
        {#if node.fill}
          <div class="fill-row">
            <Popup trigger={fillTrigger} content={fillContent} />
            <Field value={node.fill.color} unit="hex" onchange={setFillHex} />
            <Divider vertical />
            <Field
              value={round(node.fill.opacity * 100)}
              kind="number"
              unit="%"
              onchange={setFillAlpha}
            />
            <Tooltip label="Retirer le remplissage" position="left">
              <button
                type="button"
                class="toggle-remove"
                aria-label="Retirer le remplissage"
                onclick={() => setNodesFill([node.id], null)}
              >
                <Icon name={Minus} size={14} strokeWidth={1.8} />
              </button>
            </Tooltip>
          </div>
        {:else}
          <button
            type="button"
            class="toggle-add"
            onclick={() => toggleNodesFill([node.id])}
          >
            <Icon name={Plus} size={14} strokeWidth={1.8} />
            <span>Ajouter un remplissage</span>
          </button>
        {/if}
      </Section>

      <Section title="Contour" defaultOpen={false}>
        {#if node.stroke}
          <div class="fill-row">
            <Popup trigger={strokeTrigger} content={strokeContent} />
            <Slider
              min={0}
              max={20}
              step={0.5}
              value={node.stroke.width}
              onchange={(v) => setStrokeWidth(String(v))}
              label="Épaisseur du contour"
            />
            <span class="stroke-w">{round(node.stroke.width)}px</span>
            <Tooltip label="Retirer le contour" position="left">
              <button
                type="button"
                class="toggle-remove"
                aria-label="Retirer le contour"
                onclick={() => setNodesStroke([node.id], null)}
              >
                <Icon name={Minus} size={14} strokeWidth={1.8} />
              </button>
            </Tooltip>
          </div>
        {:else}
          <button
            type="button"
            class="toggle-add"
            onclick={() => toggleNodesStroke([node.id])}
          >
            <Icon name={Plus} size={14} strokeWidth={1.8} />
            <span>Ajouter un contour</span>
          </button>
        {/if}
      </Section>

      <Section title="Opacité">
        <div class="fill-row">
          <Slider
            min={0}
            max={100}
            step={1}
            value={node.opacity * 100}
            onchange={setOpacity}
            label="Opacité"
          />
          <span class="stroke-w">{Math.round(node.opacity * 100)}%</span>
        </div>
      </Section>

      <Section title="Fusion" defaultOpen={false}>
        <select
          class="blend"
          value={node.blendMode}
          onchange={(e) => setBlend((e.currentTarget as HTMLSelectElement).value as BlendMode)}
          aria-label="Mode de fusion"
        >
          <option value="normal">Normal</option>
          <option value="multiply">Produit</option>
          <option value="screen">Superposition</option>
          <option value="overlay">Incrustation</option>
        </select>
      </Section>

      {#if rectNode}
        <Section title="Export" defaultOpen={false}>
          <div class="export-sizes">
            <span>
              L {round(rectNode.width)} × H {round(rectNode.height)} px
            </span>
            <button type="button" class="export-btn" disabled>Exporter en PNG — bientôt</button>
          </div>
        </Section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    width: 232px;
    flex-shrink: 0;
    border-left: 1px solid var(--border);
    background: var(--surface);
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 34px;
    padding: 0 12px 0 16px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }
  .panel-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .head-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-xs);
    color: var(--text-tertiary);
  }
  .head-action:hover {
    background: var(--hover);
    color: var(--text);
  }
  .head-action-on {
    color: var(--accent);
  }
  .list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  .empty {
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text-tertiary);
    text-align: center;
    padding: 40px 20px;
  }
  .multi {
    font-size: 12.5px;
    color: var(--text-secondary);
  }
  .field-row {
    display: flex;
    gap: 6px;
  }
  .fill-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .fill-trigger {
    display: inline-flex;
    flex-shrink: 0;
    border-radius: var(--radius-xs);
  }
  .color-pop {
    width: 224px;
    padding: 8px;
  }
  .stroke-w {
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .toggle-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-xs);
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  .toggle-remove:hover {
    background: var(--hover);
    color: var(--text);
  }
  .toggle-add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    font-size: 12.5px;
    color: var(--text-secondary);
    background: transparent;
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-xs);
    transition:
      color 90ms ease,
      border-color 90ms ease,
      background-color 90ms ease;
  }
  .toggle-add:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .blend {
    width: 100%;
    height: 28px;
    padding: 0 8px;
    font-size: 12.5px;
    color: var(--text);
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
  }
  .export-sizes {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    font-size: 12.5px;
    color: var(--text-secondary);
  }
  .export-btn {
    height: 30px;
    font-size: 12.5px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xs);
  }
  .export-btn:disabled {
    opacity: 0.45;
  }
</style>
