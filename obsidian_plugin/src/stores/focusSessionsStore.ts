import { defineStore } from 'pinia';
import type { FocusSession, FocusSessionStatus } from '@/types/focusSessions';

interface FocusSessionsState {
    sessions: FocusSession[];
}

export const useFocusSessionsStore = defineStore('focusSessions', {
    state: (): FocusSessionsState => ({ sessions: [] }),

    getters: {
        activeSession: (state): FocusSession | undefined => state.sessions.find((session) => session.status === 'active'),
        sessionsForTask: (state) => (taskId: string): FocusSession[] => state.sessions
            .filter((session) => session.taskId === taskId)
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    },

    actions: {
        hydrate(value: unknown) {
            if (!Array.isArray(value)) {
                this.sessions = [];
                return;
            }

            this.sessions = value.filter((item): item is FocusSession => {
                if (!item || typeof item !== 'object') return false;
                const session = item as Partial<FocusSession>;
                return typeof session.id === 'string'
                    && typeof session.taskId === 'string'
                    && ['focus', 'creation', 'administration'].includes(session.mode || '')
                    && ['active', 'completed', 'interrupted'].includes(session.status || '')
                    && typeof session.startedAt === 'string';
            }).map((session) => ({ ...session }));

            const active = this.sessions.filter((session) => session.status === 'active');
            if (active.length > 1) {
                active.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
                const [latest, ...older] = active;
                this.sessions = this.sessions.map((session) => older.some((candidate) => candidate.id === session.id)
                    ? { ...session, status: 'interrupted' as FocusSessionStatus, endedAt: latest.startedAt, updatedAt: latest.startedAt }
                    : session);
            }
        }
    }
});
