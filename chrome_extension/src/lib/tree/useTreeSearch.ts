import { ref, computed, Ref } from 'vue'
import type { TreeItem } from '../components/vue-tree-dnd-main/env'

interface SearchFilter {
  id: string
  type: 'text' | 'date' | 'tag' | 'custom'
  field: string
  value: any
  operator?: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'before' | 'after' | 'between'
  enabled: boolean
  customMatcher?: (item: TreeItem, value: any) => boolean
}

interface SearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  recursive?: boolean
  limit?: number
  sortBy?: keyof TreeItem | ((a: TreeItem, b: TreeItem) => number)
  sortDirection?: 'asc' | 'desc'
}

export function useTreeSearch(initialData?: TreeItem[]) {
  const treeData: Ref<TreeItem[]> = ref(initialData || [])
  const searchTerm = ref('')
  const filters = ref<SearchFilter[]>([])
  const searchOptions = ref<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    recursive: true,
    limit: 100,
    sortDirection: 'asc'
  })

  // Fonction utilitaire pour parcourir l'arbre récursivement
  const traverseTree = (
    items: TreeItem[],
    callback: (item: TreeItem, path: TreeItem[]) => void,
    path: TreeItem[] = []
  ) => {
    items.forEach(item => {
      const currentPath = [...path, item]
      callback(item, currentPath)
      if (item.children && item.children.length > 0) {
        traverseTree(item.children, callback, currentPath)
      }
    })
  }

  // Vérifie si un item correspond aux critères de recherche
  const matchesSearchCriteria = (item: TreeItem, path: TreeItem[]): boolean => {
    // Si pas de terme de recherche et pas de filtres actifs, tout correspond
    if (!searchTerm.value && !filters.value.some(f => f.enabled)) return true

    // Vérification du terme de recherche
    if (searchTerm.value) {
      const itemText = item.text || ''
      const searchText = searchOptions.value.caseSensitive 
        ? searchTerm.value 
        : searchTerm.value.toLowerCase()
      const compareText = searchOptions.value.caseSensitive 
        ? itemText 
        : itemText.toLowerCase()

      if (searchOptions.value.wholeWord) {
        const words = compareText.split(/\s+/)
        if (!words.some(word => word === searchText)) return false
      } else if (!compareText.includes(searchText)) {
        return false
      }
    }

    // Vérification des filtres actifs
    return filters.value
      .filter(f => f.enabled)
      .every(filter => {
        const value = filter.field.split('.').reduce((obj: any, key) => obj?.[key], item)
        
        switch (filter.type) {
          case 'text':
            switch (filter.operator) {
              case 'contains':
                return String(value).includes(String(filter.value))
              case 'equals':
                return String(value) === String(filter.value)
              case 'startsWith':
                return String(value).startsWith(String(filter.value))
              case 'endsWith':
                return String(value).endsWith(String(filter.value))
              default:
                return String(value).includes(String(filter.value))
            }
          
          case 'date':
            const dateValue = new Date(value)
            const filterDate = new Date(filter.value)
            switch (filter.operator) {
              case 'before':
                return dateValue < filterDate
              case 'after':
                return dateValue > filterDate
              case 'equals':
                return dateValue.toDateString() === filterDate.toDateString()
              default:
                return true
            }
          
          case 'custom':
            return filter.customMatcher ? filter.customMatcher(item, filter.value) : true
          
          default:
            return true
        }
      })
  }

  // Résultats de recherche calculés
  const searchResults = computed(() => {
    const results: { item: TreeItem; path: TreeItem[] }[] = []
    
    traverseTree(treeData.value, (item, path) => {
      if (matchesSearchCriteria(item, path)) {
        results.push({ item, path })
      }
    })

    // Tri des résultats
    if (searchOptions.value.sortBy) {
      results.sort((a, b) => {
        if (typeof searchOptions.value.sortBy === 'function') {
          return searchOptions.value.sortBy(a.item, b.item)
        }
        
        const aValue = a.item[searchOptions.value.sortBy as keyof TreeItem]
        const bValue = b.item[searchOptions.value.sortBy as keyof TreeItem]
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        return searchOptions.value.sortDirection === 'desc' ? -comparison : comparison
      })
    }

    // Limitation du nombre de résultats
    if (searchOptions.value.limit) {
      return results.slice(0, searchOptions.value.limit)
    }

    return results
  })

  // Ajouter un nouveau filtre
  const addFilter = (filter: Omit<SearchFilter, 'id'>) => {
    filters.value.push({
      ...filter,
      id: crypto.randomUUID()
    })
  }

  // Supprimer un filtre
  const removeFilter = (filterId: string) => {
    filters.value = filters.value.filter(f => f.id !== filterId)
  }

  // Mettre à jour un filtre
  const updateFilter = (filterId: string, updates: Partial<SearchFilter>) => {
    const filterIndex = filters.value.findIndex(f => f.id === filterId)
    if (filterIndex !== -1) {
      filters.value[filterIndex] = {
        ...filters.value[filterIndex],
        ...updates
      }
    }
  }

  // Mettre à jour les options de recherche
  const updateSearchOptions = (options: Partial<SearchOptions>) => {
    searchOptions.value = {
      ...searchOptions.value,
      ...options
    }
  }

  // Mettre à jour les données de l'arbre
  const updateTreeData = (newData: TreeItem[]) => {
    treeData.value = newData
  }

  return {
    // État
    searchTerm,
    filters,
    searchOptions,
    searchResults,

    // Actions
    addFilter,
    removeFilter,
    updateFilter,
    updateSearchOptions,
    updateTreeData,

    // Utilitaires
    traverseTree
  }
} 