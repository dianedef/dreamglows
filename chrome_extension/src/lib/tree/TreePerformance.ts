import type { Observable} from 'rxjs';
import { Subject, timer } from 'rxjs'
import { buffer, filter, map } from 'rxjs/operators'
import type { TreeEvent } from './TreeEvents'

export interface PerformanceMetric {
  eventType: string
  duration: number
  timestamp: number
  nodeCount?: number
  depth?: number
}

export class TreePerformance {
  private metricsSubject = new Subject<PerformanceMetric>()
  private operationsBuffer = new Subject<TreeEvent>()
  
  public readonly metrics$ = this.metricsSubject.asObservable()
  public readonly heavyOperations$: Observable<TreeEvent[]>

  private readonly HEAVY_OPERATION_THRESHOLD = 100 // ms

  constructor() {
    // Surveiller les opérations qui s'accumulent dans un court laps de temps
    this.heavyOperations$ = this.operationsBuffer.pipe(
      buffer(timer(0, 1000)), // Regrouper les opérations par seconde
      filter(operations => operations.length > 0),
      map(operations => operations.filter(op => 
        ['move', 'add', 'remove'].includes(op.type)
      ))
    )
  }

  trackOperation(event: TreeEvent, startTime: number): void {
    const duration = performance.now() - startTime
    
    this.metricsSubject.next({
      eventType: event.type,
      duration,
      timestamp: Date.now()
    })

    if (duration > this.HEAVY_OPERATION_THRESHOLD) {
      this.operationsBuffer.next(event)
    }
  }

  trackTreeMetrics(nodeCount: number, maxDepth: number): void {
    this.metricsSubject.next({
      eventType: 'tree_metrics',
      duration: 0,
      timestamp: Date.now(),
      nodeCount,
      depth: maxDepth
    })
  }

  getAverageOperationTime(eventType: string): Observable<number> {
    return this.metrics$.pipe(
      filter(metric => metric.eventType === eventType),
      map(metric => metric.duration),
      buffer(timer(0, 5000)), // Calculer la moyenne toutes les 5 secondes
      map(durations => {
        if (durations.length === 0) return 0
        return durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      })
    )
  }

  detectPerformanceIssues(): Observable<string> {
    return this.metrics$.pipe(
      buffer(timer(0, 10000)), // Analyser toutes les 10 secondes
      map(metrics => {
        const issues: string[] = []
        
        // Vérifier les opérations lentes
        const slowOperations = metrics.filter(m => m.duration > this.HEAVY_OPERATION_THRESHOLD)
        if (slowOperations.length > 5) {
          issues.push(`Détecté ${slowOperations.length} opérations lentes`)
        }

        // Vérifier la profondeur de l'arbre
        const lastMetrics = metrics.find(m => m.eventType === 'tree_metrics')
        if (lastMetrics?.depth && lastMetrics.depth > 10) {
          issues.push(`Profondeur d'arbre élevée: ${lastMetrics.depth} niveaux`)
        }

        return issues.join(', ')
      }),
      filter(issues => issues.length > 0)
    )
  }
} 