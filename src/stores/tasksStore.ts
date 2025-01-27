import { defineStore } from 'pinia';
import type { Task } from '@/types/tasks';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '@/services/StorageService';

interface TasksState {
    tasks: Task[];
    storageService: StorageService | null;
}

export const useTasksStore = defineStore('tasks', {
    state: (): TasksState => ({
        tasks: [],
        storageService: null
    }),

    getters: {
        getTasks: (state) => state.tasks,
        getTaskById: (state) => (id: string) => state.tasks.find(task => task.id === id),
        getTasksByDate: (state) => (date: string) => state.tasks.filter(task => task.date === date)
    },

    actions: {
        initializeService(app: any) {
            this.storageService = new StorageService(app);
            this.loadTasks();
        },

        async loadTasks() {
            if (!this.storageService) return;
            const { tasks } = await this.storageService.loadData();
            this.tasks = tasks;
        },

        async saveTasks() {
            if (!this.storageService) return;
            await this.storageService.saveData([], this.tasks); // On passe un tableau vide pour les goals
        },

        async addTask(taskData: Partial<Task>) {
            const newTask: Task = {
                id: uuidv4(),
                title: taskData.title || '',
                description: taskData.description,
                date: taskData.date,
                priority: taskData.priority || 'medium',
                status: taskData.status || 'todo',
                tags: taskData.tags || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
            await this.saveTasks();
        },

        async updateTask(taskData: Partial<Task> & { id: string }) {
            const index = this.tasks.findIndex(task => task.id === taskData.id);
            if (index !== -1) {
                this.tasks[index] = {
                    ...this.tasks[index],
                    ...taskData,
                    updatedAt: new Date().toISOString()
                };
                await this.saveTasks();
            }
        },

        async deleteTask(id: string) {
            const index = this.tasks.findIndex(task => task.id === id);
            if (index !== -1) {
                this.tasks.splice(index, 1);
                await this.saveTasks();
            }
        },

        async setTasks(tasks: Task[]) {
            this.tasks = tasks;
            await this.saveTasks();
        }
    }
}); 