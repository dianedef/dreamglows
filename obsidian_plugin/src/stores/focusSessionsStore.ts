import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { FocusMode, FocusSession, FocusSessionStatus } from '@/types/focusSessions';

interface FocusSessionsState {
    sessions: FocusSession[];
}

const now = () => new Date().toISOString();

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
        },

        start(taskId: string, goalId?: string, mode: FocusMode = 'focus'): FocusSession {
            const current = this.activeSession;
            if (current) {
                this.interrupt(current.id);
            }

            const timestamp = now();
            const session: FocusSession = {
                id: uuidv4(),
                taskId,
                goalId,
                mode,
                status: 'active',
                startedAt: timestamp,
                createdAt: timestamp,
                updatedAt: timestamp
            };
            this.sessions.push(session);
            return session;
        },

        finish(id: string, status: Exclude<FocusSessionStatus, 'active'>, handoffNote?: string, nextAction?: string) {
            const index = this.sessions.findIndex((session) => session.id === id);
            if (index < 0) return;
            const endedAt = now();
            const existing = this.sessions[index];
            this.sessions[index] = {
                ...existing,
                status,
                endedAt,
                durationMinutes: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(existing.startedAt)) / 60000)),
                handoffNote: handoffNote?.trim() || undefined,
                nextAction: nextAction?.trim() || undefined,
                updatedAt: endedAt
            };
        },

        interrupt(id: string, handoffNote?: string, nextAction?: string) {
            this.finish(id, 'interrupted', handoffNote, nextAction);
        }
    }
});
