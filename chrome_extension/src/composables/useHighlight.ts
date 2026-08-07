import { ref, Ref } from 'vue'

interface Highlight {
  id: string
  text: string
  sourceUrl: string
  sourceElement: string
  position: {
    start: number
    end: number
  }
  color?: string
  createdAt: Date
}

export function useHighlight() {
  const highlights: Ref<Highlight[]> = ref([])

  // Vérifie si deux ranges se chevauchent
  const doRangesOverlap = (range1: Range, range2: Range): boolean => {
    return !(range1.compareBoundaryPoints(Range.END_TO_START, range2) > 0 ||
           range2.compareBoundaryPoints(Range.END_TO_START, range1) > 0)
  }

  // Trouve tous les surlignages qui se chevauchent avec la sélection actuelle
  const findOverlappingHighlights = (range: Range): string[] => {
    const overlappingIds: string[] = []
    
    document.querySelectorAll('[data-highlight-id]').forEach(element => {
      const elementRange = document.createRange()
      elementRange.selectNode(element)
      
      if (doRangesOverlap(range, elementRange)) {
        const highlightId = (element as HTMLElement).dataset.highlightId
        if (highlightId && !overlappingIds.includes(highlightId)) {
          overlappingIds.push(highlightId)
        }
      }
    })

    return overlappingIds
  }

  // Fusionne le texte de plusieurs ranges
  const mergeRanges = (mainRange: Range, overlappingIds: string[]): Range => {
    const mergedRange = mainRange.cloneRange()
    
    overlappingIds.forEach(id => {
      const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
      elements.forEach(element => {
        const elementRange = document.createRange()
        elementRange.selectNode(element)
        
        // Étend le range principal si nécessaire
        if (elementRange.compareBoundaryPoints(Range.START_TO_START, mergedRange) < 0) {
          mergedRange.setStart(elementRange.startContainer, elementRange.startOffset)
        }
        if (elementRange.compareBoundaryPoints(Range.END_TO_END, mergedRange) > 0) {
          mergedRange.setEnd(elementRange.endContainer, elementRange.endOffset)
        }
      })
    })
    
    return mergedRange
  }

  const createHighlight = (selection: Selection): Highlight | null => {
    if (!selection || selection.isCollapsed) {
      console.log('🔍 Sélection vide ou invalide')
      return null
    }

    try {
      const range = selection.getRangeAt(0)
      console.log('📝 Texte sélectionné:', selection.toString())

      // Trouver les surlignages qui se chevauchent
      const overlappingIds = findOverlappingHighlights(range)
      console.log('🔍 Surlignages chevauchants trouvés:', overlappingIds.length)

      // Si des surlignages se chevauchent, les fusionner
      let finalRange = range
      if (overlappingIds.length > 0) {
        finalRange = mergeRanges(range, overlappingIds)
        // Supprimer les anciens surlignages
        overlappingIds.forEach(id => removeHighlight(id))
      }

      const text = finalRange.toString()
      const id = crypto.randomUUID()

      // Si la sélection traverse plusieurs éléments
      if (finalRange.startContainer !== finalRange.endContainer) {
        console.log('⚠️ Sélection multi-éléments détectée')
        
        // Extraire tous les nœuds de texte dans la sélection
        const textNodes: Text[] = []
        const walker = document.createTreeWalker(
          finalRange.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              if (!(node.parentElement?.dataset?.highlightId) && finalRange.intersectsNode(node)) {
                return NodeFilter.FILTER_ACCEPT
              }
              return NodeFilter.FILTER_REJECT
            }
          }
        )

        let node: Node | null
        while (node = walker.nextNode()) {
          if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node as Text)
          }
        }

        console.log('📚 Nombre de nœuds de texte trouvés:', textNodes.length)

        // Traiter chaque nœud de texte
        textNodes.forEach((textNode, index) => {
          const nodeRange = document.createRange()
          nodeRange.selectNode(textNode)

          // Ajuster les offsets pour le premier et dernier nœud
          if (index === 0) {
            nodeRange.setStart(textNode, finalRange.startContainer === textNode ? finalRange.startOffset : 0)
          }
          if (index === textNodes.length - 1) {
            nodeRange.setEnd(textNode, finalRange.endContainer === textNode ? finalRange.endOffset : textNode.length)
          }

          const span = document.createElement('span')
          span.style.backgroundColor = '#ffeb3b'
          span.dataset.highlightId = id
          
          try {
            const fragment = nodeRange.extractContents()
            span.appendChild(fragment)
            nodeRange.insertNode(span)
            console.log('✅ Span créé pour le nœud:', textNode.textContent)
          } catch (e) {
            console.error('❌ Erreur lors de la création du span:', e)
          }
        })

      } else {
        console.log('🎯 Sélection simple élément')
        const highlightSpan = document.createElement('span')
        highlightSpan.style.backgroundColor = '#ffeb3b'
        highlightSpan.dataset.highlightId = id
        
        const fragment = finalRange.extractContents()
        highlightSpan.appendChild(fragment)
        finalRange.insertNode(highlightSpan)
        console.log('✅ Span créé pour la sélection simple')
      }

      const highlight: Highlight = {
        id,
        text,
        sourceUrl: window.location.href,
        sourceElement: finalRange.commonAncestorContainer.nodeName || 'UNKNOWN',
        position: {
          start: finalRange.startOffset,
          end: finalRange.endOffset
        },
        color: '#ffeb3b',
        createdAt: new Date()
      }

      highlights.value.push(highlight)
      console.log('💾 Highlight enregistré:', highlight)
      return highlight
    } catch (error) {
      console.error('❌ Erreur lors de la création du surlignage:', error)
      return null
    }
  }

  const removeHighlight = (id: string) => {
    try {
      console.log('🗑️ Tentative de suppression du highlight:', id)
      const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
      console.log('🔍 Nombre d\'éléments à supprimer:', elements.length)

      elements.forEach(element => {
        const parent = element.parentNode
        if (parent) {
          const fragment = document.createDocumentFragment()
          while (element.firstChild) {
            fragment.appendChild(element.firstChild)
          }
          parent.replaceChild(fragment, element)
          parent.normalize()
          console.log('✅ Élément supprimé et contenu restauré')
        }
      })

      highlights.value = highlights.value.filter(h => h.id !== id)
      console.log('💾 Liste des highlights mise à jour')
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du surlignage:', error)
    }
  }

  const getAllHighlights = () => {
    return highlights.value
  }

  const getHighlightsBySource = (sourceUrl: string) => {
    return highlights.value.filter(h => h.sourceUrl === sourceUrl)
  }

  const updateHighlightColor = (id: string, color: string) => {
    try {
      console.log('🎨 Mise à jour de la couleur pour:', id)
      const highlight = highlights.value.find(h => h.id === id)
      if (highlight) {
        highlight.color = color
        const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`)
        elements.forEach(element => {
          (element as HTMLElement).style.backgroundColor = color
        })
        console.log('✅ Couleur mise à jour')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la couleur:', error)
    }
  }

  return {
    createHighlight,
    removeHighlight,
    getAllHighlights,
    getHighlightsBySource,
    updateHighlightColor,
    highlights
  }
} 