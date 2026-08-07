import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './app.vue'
import routes from '~pages'
import '@/assets/base.scss'
import './index.scss'

routes.push({
  path: '/',
  redirect: '/setup/update',
})

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Attendre que les données soient chargées avant de monter l'app
chrome.storage.local.get(['tree-store'], (result) => {
  // Stocker les données initiales pour le store si elles existent
  if (result['tree-store']) {
    (window as any).__INITIAL_TREE_STORE_DATA__ = result['tree-store']
  }
  
  // Monter l'application
  const app = createApp(App)
  app.use(router)
  app.use(pinia)
  app.mount('#app')
})

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`
  )
}
