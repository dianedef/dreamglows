import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Setting {
  id: string
  name: string
  description: string
  category: 'general' | 'appearance' | 'sync' | 'advanced'
  type: 'boolean' | 'string' | 'number' | 'select'
  value: any
  defaultValue: any
  options?: { label: string; value: any }[]
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Setting[]>([
    {
      id: 'darkMode',
      name: 'Mode sombre',
      description: 'Activer le thème sombre pour l\'interface',
      category: 'appearance',
      type: 'boolean',
      value: false,
      defaultValue: false
    },
    {
      id: 'autoSync',
      name: 'Synchronisation automatique',
      description: 'Synchroniser automatiquement les données avec le cloud',
      category: 'sync',
      type: 'boolean',
      value: true,
      defaultValue: true
    },
    {
      id: 'syncInterval',
      name: 'Intervalle de synchronisation',
      description: 'Fréquence de synchronisation automatique',
      category: 'sync',
      type: 'select',
      value: '30min',
      defaultValue: '30min',
      options: [
        { label: '5 minutes', value: '5min' },
        { label: '15 minutes', value: '15min' },
        { label: '30 minutes', value: '30min' },
        { label: '1 heure', value: '1h' }
      ]
    },
    {
      id: 'defaultView',
      name: 'Vue par défaut',
      description: 'Vue à afficher au démarrage',
      category: 'general',
      type: 'select',
      value: 'tree',
      defaultValue: 'tree',
      options: [
        { label: 'Arborescence', value: 'tree' },
        { label: 'Liste', value: 'list' },
        { label: 'Grille', value: 'grid' }
      ]
    },
    {
      id: 'maxItems',
      name: 'Nombre maximum d\'éléments',
      description: 'Nombre maximum d\'éléments à afficher par page',
      category: 'general',
      type: 'number',
      value: 50,
      defaultValue: 50
    },
    {
      id: 'highlightColor',
      name: 'Couleur de surlignage',
      description: 'Couleur par défaut pour le surlignage de texte',
      category: 'appearance',
      type: 'string',
      value: '#ffeb3b',
      defaultValue: '#ffeb3b'
    },
    {
      id: 'debugMode',
      name: 'Mode debug',
      description: 'Activer les logs de débogage',
      category: 'advanced',
      type: 'boolean',
      value: false,
      defaultValue: false
    }
  ])

  // Mettre à jour un paramètre
  const updateSetting = (id: string, value: any) => {
    const setting = settings.value.find(s => s.id === id)
    if (setting) {
      setting.value = value
    }
  }

  // Réinitialiser un paramètre
  const resetSetting = (id: string) => {
    const setting = settings.value.find(s => s.id === id)
    if (setting) {
      setting.value = setting.defaultValue
    }
  }

  // Réinitialiser tous les paramètres
  const resetAllSettings = () => {
    settings.value.forEach(setting => {
      setting.value = setting.defaultValue
    })
  }

  // Obtenir les paramètres par catégorie
  const getSettingsByCategory = (category: Setting['category']) => {
    return settings.value.filter(s => s.category === category)
  }

  return {
    settings,
    updateSetting,
    resetSetting,
    resetAllSettings,
    getSettingsByCategory
  }
}) 