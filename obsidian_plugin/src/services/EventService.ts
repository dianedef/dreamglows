import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Goal, Task } from '../types/models';
import { DailyMood } from './StorageService';

export type EventType = 
    | 'goal:created' 
    | 'goal:updated' 
    | 'goal:deleted'
    | 'task:created'
    | 'task:updated'
    | 'task:deleted'
    | 'mood:updated'
    | 'data:synced'
    | 'stats:updated';

export interface Event<T = any> {
    type: EventType;
    payload: T;
    timestamp: string;
}

export class EventService {
    private eventSubject = new Subject<Event>();
    private goalSubject = new BehaviorSubject<Goal[]>([]);
    private taskSubject = new BehaviorSubject<Task[]>([]);
    private moodSubject = new BehaviorSubject<Record<string, DailyMood>>({});

    // Stream public d'événements
    public events$ = this.eventSubject.asObservable();
    
    // Streams spécifiques
    public goals$ = this.goalSubject.asObservable();
    public tasks$ = this.taskSubject.asObservable();
    public moods$ = this.moodSubject.asObservable();

    /**
     * Émet un événement dans le système
     */
    emit<T>(type: EventType, payload: T): void {
        const event: Event<T> = {
            type,
            payload,
            timestamp: new Date().toISOString()
        };
        this.eventSubject.next(event);
        this.updateState(event);
    }

    /**
     * S'abonne à un type d'événement spécifique
     */
    on<T>(type: EventType): Observable<T> {
        return this.events$.pipe(
            filter(event => event.type === type),
            map(event => event.payload)
        );
    }

    /**
     * Met à jour les goals
     */
    updateGoals(goals: Goal[]): void {
        this.goalSubject.next(goals);
        this.emit('stats:updated', { type: 'goals', timestamp: new Date().toISOString() });
    }

    /**
     * Met à jour les tâches
     */
    updateTasks(tasks: Task[]): void {
        this.taskSubject.next(tasks);
        this.emit('stats:updated', { type: 'tasks', timestamp: new Date().toISOString() });
    }

    /**
     * Met à jour l'humeur pour une date donnée
     */
    updateMood(date: string, mood: DailyMood): void {
        const currentMoods = this.moodSubject.value;
        this.moodSubject.next({
            ...currentMoods,
            [date]: mood
        });
        this.emit('mood:updated', { date, mood });
    }

    /**
     * Obtient l'état actuel des goals
     */
    getCurrentGoals(): Goal[] {
        return this.goalSubject.value;
    }

    /**
     * Obtient l'état actuel des tâches
     */
    getCurrentTasks(): Task[] {
        return this.taskSubject.value;
    }

    /**
     * Obtient l'état actuel des humeurs
     */
    getCurrentMoods(): Record<string, DailyMood> {
        return this.moodSubject.value;
    }

    /**
     * Met à jour l'état interne en fonction des événements
     */
    private updateState(event: Event): void {
        switch (event.type) {
            case 'goal:created':
            case 'goal:updated': {
                const goals = [...this.goalSubject.value];
                const index = goals.findIndex(g => g.id === (event.payload as Goal).id);
                if (index >= 0) {
                    goals[index] = event.payload;
                } else {
                    goals.push(event.payload);
                }
                this.goalSubject.next(goals);
                break;
            }
            case 'goal:deleted': {
                const goals = this.goalSubject.value.filter(
                    g => g.id !== (event.payload as string)
                );
                this.goalSubject.next(goals);
                break;
            }
            case 'task:created':
            case 'task:updated': {
                const tasks = [...this.taskSubject.value];
                const index = tasks.findIndex(t => t.id === (event.payload as Task).id);
                if (index >= 0) {
                    tasks[index] = event.payload;
                } else {
                    tasks.push(event.payload);
                }
                this.taskSubject.next(tasks);
                break;
            }
            case 'task:deleted': {
                const tasks = this.taskSubject.value.filter(
                    t => t.id !== (event.payload as string)
                );
                this.taskSubject.next(tasks);
                break;
            }
            case 'mood:updated': {
                const { date, mood } = event.payload as { date: string; mood: DailyMood };
                const moods = {
                    ...this.moodSubject.value,
                    [date]: mood
                };
                this.moodSubject.next(moods);
                break;
            }
            case 'data:synced': {
                const { goals, tasks, moods } = event.payload as {
                    goals: Goal[];
                    tasks: Task[];
                    moods: Record<string, DailyMood>;
                };
                this.goalSubject.next(goals);
                this.taskSubject.next(tasks);
                this.moodSubject.next(moods);
                break;
            }
        }
    }
} 