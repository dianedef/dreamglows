export type FocusMode = 'focus' | 'creation' | 'administration';
export type FocusSessionStatus = 'active' | 'completed' | 'interrupted';

export interface FocusSession {
    id: string;
    taskId: string;
    goalId?: string;
    mode: FocusMode;
    status: FocusSessionStatus;
    startedAt: string;
    endedAt?: string;
    durationMinutes?: number;
    handoffNote?: string;
    nextAction?: string;
    createdAt: string;
    updatedAt: string;
}
