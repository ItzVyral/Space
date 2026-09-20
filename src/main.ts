import { mount } from 'svelte'
import './styles/global.css'
import App from './App.svelte'
import { theme } from './stores/theme.store'

const target = document.getElementById('app')

if (!target) {
  throw new Error('Conteneur #app introuvable')
}

theme.subscribe((t) => {
  document.documentElement.dataset.theme = t
})

mount(App, { target })