import { defineStore } from 'pinia';
import type { Task } from '@/types/tasks';
import { v4 as uuidv4 } from 'uuid';

export const useTasksStore = defineStore('tasks', {
    state: () => ({
        tasks: [] as Task[]
    }),

    getters: {
        getTasks: (state) => state.tasks,
        getTaskById: (state) => (id: string) => state.tasks.find(task => task.id === id),
        getTasksByDate: (state) => (date: string) => state.tasks.filter(task => task.date === date)
    },

    actions: {
        addTask(taskData: Partial<Task>) {
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
        },

        updateTask(taskData: Partial<Task> & { id: string }) {
            const index = this.tasks.findIndex(task => task.id === taskData.id);
            if (index !== -1) {
                this.tasks[index] = {
                    ...this.tasks[index],
                    ...taskData,
                    updatedAt: new Date().toISOString()
                };
            }
        },

        deleteTask(id: string) {
            const index = this.tasks.findIndex(task => task.id === id);
            if (index !== -1) {
                this.tasks.splice(index, 1);
            }
        },

        setTasks(tasks: Task[]) {
            this.tasks = tasks;
        }
    }
}); 