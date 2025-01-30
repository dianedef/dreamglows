import { defineStore } from 'pinia';
import type { Task } from '@/types/tasks';
import { v4 as uuidv4 } from 'uuid';

interface TasksState {
    tasks: Task[];
}

export const useTasksStore = defineStore('tasks', {
    state: (): TasksState => ({
        tasks: []
    }),

    getters: {
        getTasks: (state) => state.tasks,
        getTaskById: (state) => (id: string) => state.tasks.find(task => task.id === id),
        getTasksByDate: (state) => (date: string) => state.tasks.filter(task => task.startDate === date),
        getTasksByGoal: (state) => (goalId: string) => state.tasks.filter(task => task.goalId === goalId)
    },

    actions: {
        async addTask(taskData: Partial<Task>) {
            console.log('TasksStore: Adding task', taskData);
            const newTask: Task = {
                id: uuidv4(),
                title: taskData.title || '',
                description: taskData.description || '',
                startDate: taskData.startDate || new Date().toISOString(),
                dueDate: taskData.dueDate,
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
            
            // Réaffecter le tableau complet
            this.tasks = [...this.tasks, newTask];
            console.log('TasksStore: Task added, now', this.tasks.length, 'tasks');
            return newTask;
        },

        async updateTask(taskData: Partial<Task> & { id: string }) {
            const index = this.tasks.findIndex(task => task.id === taskData.id);
            if (index !== -1) {
                // Créer un nouveau tableau avec la tâche mise à jour
                const updatedTask = {
                    ...this.tasks[index],
                    ...taskData,
                    updatedAt: new Date().toISOString()
                };
                
                this.tasks = [
                    ...this.tasks.slice(0, index),
                    updatedTask,
                    ...this.tasks.slice(index + 1)
                ];
                console.log('TasksStore: Task updated, now', this.tasks.length, 'tasks');
                return updatedTask;
            }
            return null;
        },

        async deleteTask(id: string) {
            const index = this.tasks.findIndex(task => task.id === id);
            if (index !== -1) {
                const deletedTask = this.tasks[index];
                // Créer un nouveau tableau sans la tâche supprimée
                this.tasks = [
                    ...this.tasks.slice(0, index),
                    ...this.tasks.slice(index + 1)
                ];
                console.log('TasksStore: Task deleted, now', this.tasks.length, 'tasks');
                return deletedTask;
            }
            return null;
        },

        async setTasks(tasks: Task[]) {
            // Réaffecter directement le tableau
            this.tasks = [...tasks];
            console.log('TasksStore: Tasks set, now', this.tasks.length, 'tasks');
        }
    }
}); 