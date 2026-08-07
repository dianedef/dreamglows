import type { Observable} from 'rxjs';
import { Subject } from 'rxjs'
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators'
import type { TreeItem } from './types'
import type { MoveMutation } from '@/components/vue-tree-dnd-main/env'

export interface TreeEvent {
  type: 'add' | 'update' | 'remove' | 'move' | 'expand' | 'collapse' | 'zoom'
  nodeId: string
  data?: any
}

export class TreeEventManager {
  private nodeEvents = new Subject<TreeEvent>()
  private structureEvents = new Subject<TreeEvent>()

  // Observables publics
  public readonly nodeChanges$: Observable<TreeEvent>
  public readonly structureChanges$: Observable<TreeEvent>

  constructor() {
    // Observable pour les changements de nœuds (mise à jour des propriétés)
    this.nodeChanges$ = this.nodeEvents.pipe(
      debounceTime(50),
      filter(event => ['update', 'expand', 'collapse', 'zoom'].includes(event.type)),
      distinctUntilChanged((prev, curr) => 
        prev.type === curr.type && 
        prev.nodeId === curr.nodeId && 
        JSON.stringify(prev.data) === JSON.stringify(curr.data)
      )
    )

    // Observable pour les changements de structure (ajout, suppression, déplacement)
    this.structureChanges$ = this.structureEvents.pipe(
      debounceTime(100),
      filter(event => ['add', 'remove', 'move'].includes(event.type))
    )
  }

  // Méthodes pour émettre des événements
  emitNodeEvent(event: TreeEvent): void {
    this.nodeEvents.next(event)
  }

  emitStructureEvent(event: TreeEvent): void {
    this.structureEvents.next(event)
  }

  // Méthodes utilitaires pour émettre des événements spécifiques
  onNodeUpdate(nodeId: string, updates: Partial<TreeItem>): void {
    this.emitNodeEvent({
      type: 'update',
      nodeId,
      data: updates
    })
  }

  onNodeMove(mutation: MoveMutation): void {
    this.emitStructureEvent({
      type: 'move',
      nodeId: mutation.id,
      data: mutation
    })
  }

  onNodeAdd(parentId: string, newNode: Partial<TreeItem>): void {
    this.emitStructureEvent({
      type: 'add',
      nodeId: parentId,
      data: newNode
    })
  }

  onNodeRemove(nodeId: string): void {
    this.emitStructureEvent({
      type: 'remove',
      nodeId
    })
  }

  onNodeExpand(nodeId: string, expanded: boolean): void {
    this.emitNodeEvent({
      type: expanded ? 'expand' : 'collapse',
      nodeId
    })
  }

  onNodeZoom(nodeId: string): void {
    this.emitNodeEvent({
      type: 'zoom',
      nodeId
    })
  }
} 