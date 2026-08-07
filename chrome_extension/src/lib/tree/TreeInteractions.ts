import type { Observable} from 'rxjs';
import { Subject } from 'rxjs'
import { distinctUntilChanged, filter, map } from 'rxjs/operators'

export interface DragEvent {
  type: 'dragstart' | 'dragend' | 'dragover' | 'drop'
  sourceId: string
  targetId?: string
  position?: 'LEFT' | 'RIGHT' | 'FIRST_CHILD' | 'LAST_CHILD'
}

export interface SelectionEvent {
  type: 'select' | 'deselect' | 'multiSelect'
  nodeIds: string[]
  viewId: string
}

export interface ViewEvent {
  type: 'zoom' | 'expand' | 'collapse'
  nodeId: string
  viewId: string
}

export class TreeInteractions {
  private dragSubject = new Subject<DragEvent>()
  private selectionSubject = new Subject<SelectionEvent>()
  private viewSubject = new Subject<ViewEvent>()

  public readonly drag$ = this.dragSubject.asObservable()
  public readonly selection$ = this.selectionSubject.asObservable()
  public readonly view$ = this.viewSubject.asObservable()

  // Flux dérivés
  public readonly activeDropZones$: Observable<string[]>
  public readonly currentSelection$: Observable<Map<string, Set<string>>>
  public readonly expandedPaths$: Observable<Map<string, string[]>>

  constructor() {
    // Gestion des zones de drop actives
    this.activeDropZones$ = this.drag$.pipe(
      filter(event => event.type === 'dragover'),
      map(event => {
        const zones: string[] = []
        if (event.targetId) {
          zones.push(event.targetId)
          // Ajouter les zones adjacentes possibles
          if (event.position === 'LEFT' || event.position === 'RIGHT') {
            zones.push(`${event.targetId}-${event.position}`)
          }
        }
        return zones
      }),
      distinctUntilChanged((prev, curr) => 
        prev.length === curr.length && 
        prev.every(id => curr.includes(id))
      )
    )

    // Gestion de la sélection courante par vue
    this.currentSelection$ = this.selection$.pipe(
      map(event => {
        const selections = new Map<string, Set<string>>()
        const viewSelection = new Set(event.nodeIds)
        selections.set(event.viewId, viewSelection)
        return selections
      })
    )

    // Gestion des chemins développés par vue
    this.expandedPaths$ = this.view$.pipe(
      filter(event => event.type === 'expand' || event.type === 'collapse'),
      map(event => {
        const paths = new Map<string, string[]>()
        paths.set(event.viewId, [event.nodeId])
        return paths
      })
    )
  }

  // Méthodes pour émettre des événements
  emitDragEvent(event: DragEvent): void {
    this.dragSubject.next(event)
  }

  emitSelectionEvent(event: SelectionEvent): void {
    this.selectionSubject.next(event)
  }

  emitViewEvent(event: ViewEvent): void {
    this.viewSubject.next(event)
  }

  // Méthodes utilitaires
  handleDragStart(nodeId: string): void {
    this.emitDragEvent({
      type: 'dragstart',
      sourceId: nodeId
    })
  }

  handleDragOver(nodeId: string, position: DragEvent['position']): void {
    this.emitDragEvent({
      type: 'dragover',
      sourceId: nodeId,
      targetId: nodeId,
      position
    })
  }

  handleDrop(sourceId: string, targetId: string, position: DragEvent['position']): void {
    this.emitDragEvent({
      type: 'drop',
      sourceId,
      targetId,
      position
    })
  }

  selectNode(viewId: string, nodeId: string, isMultiSelect: boolean = false): void {
    this.emitSelectionEvent({
      type: isMultiSelect ? 'multiSelect' : 'select',
      nodeIds: [nodeId],
      viewId
    })
  }

  toggleNodeExpansion(viewId: string, nodeId: string, expand: boolean): void {
    this.emitViewEvent({
      type: expand ? 'expand' : 'collapse',
      nodeId,
      viewId
    })
  }

  zoomToNode(viewId: string, nodeId: string): void {
    this.emitViewEvent({
      type: 'zoom',
      nodeId,
      viewId
    })
  }
} 