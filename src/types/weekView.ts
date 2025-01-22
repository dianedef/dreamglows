import { DateTime } from 'luxon';
import type { Note } from './index';

export interface Day {
    date: DateTime;
    isToday: boolean;
}

export interface WeekViewProps {
    weekData: WeekNotes | null;
    expandedNotes: string[];
    app: any;
}

export interface WeekViewEmits {
    (e: 'toggle-note', path: string): void;
    (e: 'toggle-task', note: Note, task: { id: string; done: boolean }): void;
} 