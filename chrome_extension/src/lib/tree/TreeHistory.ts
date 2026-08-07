import { Subject, BehaviorSubject } from 'rxjs'
import type { TreeItem } from './types'
import type { TreeEvent } from './TreeEvents'

export interface HistoryState {
  treeData: TreeItem[]
  timestamp: number
  event: TreeEvent
}

export class TreeHistory {
  private states: HistoryState[] = []
  private currentIndex = -1
  private maxStates = 50

  private undoSubject = new Subject<HistoryState>()
  private redoSubject = new Subject<HistoryState>()
  private stateSubject = new BehaviorSubject<HistoryState | null>(null)

  public readonly undo$ = this.undoSubject.asObservable()
  public readonly redo$ = this.redoSubject.asObservable()
  public readonly currentState$ = this.stateSubject.asObservable()

  private removeCircularReferences(node: TreeItem): TreeItem {
    const { parent, ...nodeWithoutParent } = node
    return {
      ...nodeWithoutParent,
      children: node.children?.map(child => this.removeCircularReferences(child)) || []
    }
  }

  pushState(treeData: TreeItem[], event: TreeEvent): void {
    // Supprimer les états après l'index actuel (en cas de redo)
    this.states = this.states.slice(0, this.currentIndex + 1)

    // Créer une copie sans références circulaires
    const cleanTreeData = treeData.map(node => this.removeCircularReferences(node))

    // Ajouter le nouvel état
    const newState: HistoryState = {
      treeData: cleanTreeData,
      timestamp: Date.now(),
      event
    }

    this.states.push(newState)
    this.currentIndex++

    // Limiter le nombre d'états
    if (this.states.length > this.maxStates) {
      this.states.shift()
      this.currentIndex--
    }

    this.stateSubject.next(newState)
  }

  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      const state = this.states[this.currentIndex]
      this.undoSubject.next(state)
      this.stateSubject.next(state)
      return state
    }
    return null
  }

  redo(): HistoryState | null {
    if (this.currentIndex < this.states.length - 1) {
      this.currentIndex++
      const state = this.states[this.currentIndex]
      this.redoSubject.next(state)
      this.stateSubject.next(state)
      return state
    }
    return null
  }

  canUndo(): boolean {
    return this.currentIndex > 0
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1
  }

  clear(): void {
    this.states = []
    this.currentIndex = -1
    this.stateSubject.next(null)
  }
} 