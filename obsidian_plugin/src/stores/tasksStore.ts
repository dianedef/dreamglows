import { defineStore } from 'pinia';
import type { Task } from '@/types/tasks';

interface TasksState {
    tasks: Task[];
    error: string | null;
}

/** Read-only compatibility projection. Business writes use PathCommandPort. */
export const useTasksStore = defineStore('tasks', {
    state: (): TasksState => ({ tasks: [], error: null }),

    getters: {
        getTasks: (state): Task[] => state.tasks,
        getTaskById: (state) => (id: string): Task | undefined => state.tasks.find(task => task.id === id),
        getTasksByDate: (state) => (date: string): Task[] => state.tasks.filter(task => task.startDate === date),
        getTasksByGoal: (state) => (goalId: string): Task[] => state.tasks.filter(task => task.goalId === goalId),
        hasError: (state): boolean => !!state.error,
    },

    actions: {
        async setTasks(tasks: Task[]) {
            this.tasks = [...tasks];
            this.error = null;
        },
    },
});
