import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './app.vue'
import routes from '~pages'
import { useTreeStore } from '../stores/treeStore'
import { connectCanonicalTree, loadCanonicalTree } from '../lib/canonical/client'
import '@/assets/base.scss'
import './index.scss'

routes.push({ path: '/', redirect: '/setup/update' })
const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes })
async function start() {
  const tree = await loadCanonicalTree()
  const pinia = createPinia()
  const app = createApp(App).use(router).use(pinia)
  const store = useTreeStore(pinia)
  store.initializeStore(tree)
  connectCanonicalTree(store)
  app.mount('#app')
}
start().catch(error => {
  const root = document.getElementById('app')!
  const message = document.createElement('p')
  message.setAttribute('role', 'alert')
  message.textContent = `Impossible d’ouvrir vos données. ${error instanceof Error ? error.message : String(error)} Les données existantes sont conservées.`
  const retry = document.createElement('button')
  retry.textContent = 'Réessayer'
  retry.onclick = () => window.location.reload()
  root.replaceChildren(message, retry)
})
