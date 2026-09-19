<script lang="ts">
  interface Props {
    size?: number
    label?: string
    labelSize?: number
    class?: string
  }

  let { size = 32, label, labelSize = 16, class: className = '' }: Props = $props()

  let instances = 0
  const gradId = `space-logo-grad-${++instances}`
</script>

{#if label}
  <span class="lockup {className}">
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0d99ff" />
          <stop offset="1" stop-color="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${gradId})`} />
      <path
        d="M22 26 C24 19 38 17 38 24 C38 30 22 29 22 34 C22 40 36 37 42 38"
        stroke="#ffffff"
        stroke-width="5"
        stroke-linecap="round"
      />
      <circle cx="22" cy="26" r="3.5" fill="#ffffff" />
      <circle cx="42" cy="38" r="3.5" fill="#ffffff" />
    </svg>
    {#if label}
      <span class="wordmark" style="font-size: {labelSize}px">{label}</span>
    {/if}
  </span>
{:else}
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    class={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0d99ff" />
        <stop offset="1" stop-color="#7c3aed" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${gradId})`} />
    <path
      d="M22 26 C24 19 38 17 38 24 C38 30 22 29 22 34 C22 40 36 37 42 38"
      stroke="#ffffff"
      stroke-width="5"
      stroke-linecap="round"
    />
    <circle cx="22" cy="26" r="3.5" fill="#ffffff" />
    <circle cx="42" cy="38" r="3.5" fill="#ffffff" />
  </svg>
{/if}

<style>
  .lockup {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .wordmark {
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.4px;
    line-height: 1;
  }
</style>