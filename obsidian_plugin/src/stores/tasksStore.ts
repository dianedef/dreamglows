import { defineStore } from 'pinia';
import type { Task } from '@/types/tasks';
import { useProgressionStore } from './progressionStore';
import { v4 as uuidv4 } from 'uuid';

interface TasksState {
    tasks: Task[];
    error: string | null;
}

const toMinutesFromTimes = (startTime?: string, dueTime?: string): number | undefined => {
    if (!startTime || !dueTime) {
        return undefined;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [dueHour, dueMinute] = dueTime.split(':').map(Number);

    if (
        Number.isNaN(startHour) ||
        Number.isNaN(startMinute) ||
        Number.isNaN(dueHour) ||
        Number.isNaN(dueMinute)
    ) {
        return undefined;
    }

    const start = startHour * 60 + startMinute;
    const due = dueHour * 60 + dueMinute;
    const diff = due - start;

    return diff > 0 ? diff : undefined;
};

const normalizePlannedMinutes = (taskData: Partial<Task>): number | undefined => {
    if (taskData.plannedMinutes !== undefined) {
        const parsed = Number(taskData.plannedMinutes);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return toMinutesFromTimes(taskData.startTime, taskData.dueTime);
};

export const useTasksStore = defineStore('tasks', {
    state: (): TasksState => ({
        tasks: [],
        error: null
    }),

    getters: {
        getTasks: (state): Task[] => state.tasks,
        getTaskById: (state) => (id: string): Task | undefined => state.tasks.find(task => task.id === id),
        getTasksByDate: (state) => (date: string): Task[] => state.tasks.filter(task => task.startDate === date),
        getTasksByGoal: (state) => (goalId: string): Task[] => state.tasks.filter(task => task.goalId === goalId),
        hasError: (state): boolean => !!state.error
    },

    actions: {
        setError(message: string | null) {
            this.error = message;
        },

        async addTask(taskData: Partial<Task>): Promise<Task> {
            try {
                console.log('TasksStore: Adding task', taskData);
                const newTask: Task = {
                    id: uuidv4(),
                    title: taskData.title || '',
                    description: taskData.description || '',
                    startDate: taskData.startDate || new Date().toISOString(),
                    dueDate: taskData.dueDate,
                    startTime: taskData.startTime || undefined,
                    dueTime: taskData.dueTime || undefined,
                    plannedMinutes: normalizePlannedMinutes(taskData),
                    actualMinutes: taskData.actualMinutes ? Number(taskData.actualMinutes) : undefined,
                    priority: taskData.priority || 'medium',
                    status: taskData.status || 'todo',
                    goalId: taskData.goalId,
                    notes: taskData.notes || '',
                    tags: taskData.tags || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    linkToOptimizer: taskData.linkToOptimizer || false,
                    linkToGenerator: taskData.linkToGenerator || false
                };
                
                this.tasks = [...this.tasks, newTask];
                if (newTask.status === 'done') {
                    const progressionStore = useProgressionStore();
                    progressionStore.rewardTaskCompletion(newTask.id);
                }
                this.setError(null);
                console.log('TasksStore: Task added, now', this.tasks.length, 'tasks');
                return newTask;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erreur lors de l\'ajout de la tâche';
                this.setError(message);
                console.error('TasksStore: Error adding task:', error);
                throw error;
            }
        },

        async updateTask(taskData: Task): Promise<Task> {
            try {
                const index = this.tasks.findIndex(task => task.id === taskData.id);
                if (index !== -1) {
                    const previousTask = this.tasks[index];
                    const mergedTask = {
                        ...previousTask,
                        ...taskData,
                        updatedAt: new Date().toISOString()
                    };
                    const normalizedTask: Task = {
                        ...mergedTask,
                        plannedMinutes: normalizePlannedMinutes(mergedTask)
                    };
                    this.tasks = [
                        ...this.tasks.slice(0, index),
                        normalizedTask,
                        ...this.tasks.slice(index + 1)
                    ];
                    if (previousTask.status !== 'done' && normalizedTask.status === 'done') {
                        const progressionStore = useProgressionStore();
                        progressionStore.rewardTaskCompletion(normalizedTask.id);
                    }
                    this.setError(null);
                    console.log('TasksStore: Task updated');
                    return normalizedTask;
                }
                throw new Error('Tâche non trouvée');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la tâche';
                this.setError(message);
                console.error('TasksStore: Error updating task:', error);
                throw error;
            }
        },

        async deleteTask(id: string): Promise<Task> {
            try {
                const index = this.tasks.findIndex(task => task.id === id);
                if (index !== -1) {
                    const deletedTask = this.tasks[index];
                    this.tasks = [
                        ...this.tasks.slice(0, index),
                        ...this.tasks.slice(index + 1)
                    ];
                    this.setError(null);
                    console.log('TasksStore: Task deleted, now', this.tasks.length, 'tasks');
                    return deletedTask;
                }
                throw new Error('Tâche non trouvée');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erreur lors de la suppression de la tâche';
                this.setError(message);
                console.error('TasksStore: Error deleting task:', error);
                throw error;
            }
        },

        async setTasks(tasks: Task[]) {
            try {
                this.tasks = [...tasks];
                this.setError(null);
                console.log('TasksStore: Tasks set, now', this.tasks.length, 'tasks');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erreur lors de la définition des tâches';
                this.setError(message);
                console.error('TasksStore: Error setting tasks:', error);
                throw error;
            }
        }
    }
}); 
