import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: 'electron/main.ts'
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: 'electron/preload.ts'
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: 'index.html'
      }
    },
    plugins: [svelte()]
  }
})