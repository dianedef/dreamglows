import { defineStore } from 'pinia';
import type { Goal, GoalStatus, GoalFrequency } from '@/types/goals';
import { v4 as uuidv4 } from 'uuid';

interface GoalsState {
    goals: Goal[];
}

export const useGoalsStore = defineStore('goals', {
    state: (): GoalsState => ({
        goals: []
    }),

    getters: {
        getGoals: (state) => state.goals,
        getGoalById: (state) => (id: string) => state.goals.find(goal => goal.id === id),
        getGoalsByDate: (state) => (date: string) => state.goals.filter(goal => goal.startDate === date),
        getGoalsByStatus: (state) => (status: GoalStatus) => state.goals.filter(goal => goal.status === status),
        getSubGoals: (state) => (parentId: string) => state.goals.filter(goal => goal.parentGoalId === parentId)
    },

    actions: {
        createGoal(goal: Goal) {
            this.goals.push(goal);
        },

        updateGoal(goal: Goal) {
            const index = this.goals.findIndex(g => g.id === goal.id);
            if (index !== -1) {
                this.goals[index] = goal;
            }
        },

        deleteGoal(id: string) {
            this.goals = this.goals.filter(goal => goal.id !== id);
        },

        setGoals(goals: Goal[]) {
            this.goals = goals;
        },

        async addGoal(goalData: Partial<Goal>) {
            console.log('GoalsStore: Adding goal', goalData);
            const newGoal: Goal = {
                id: uuidv4(),
                title: goalData.title || '',
                description: goalData.description || '',
                category: goalData.category,
                startDate: goalData.startDate || new Date().toISOString(),
                dueDate: goalData.dueDate,
                completedDate: goalData.completedDate,
                status: goalData.status || 'todo',
                tasks: goalData.tasks || [],
                priority: goalData.priority || 'medium',
                parentGoalId: goalData.parentGoalId,
                subGoalIds: goalData.subGoalIds || [],
                progress: goalData.progress || 0,
                tags: goalData.tags || [],
                recurring: goalData.recurring || {
                    frequency: '' as GoalFrequency,
                    endDate: undefined
                },
                linkedNotes: goalData.linkedNotes || [],
                metrics: goalData.metrics || {
                    target: 0,
                    current: 0,
                    unit: ''
                }
            };
            
            this.goals = [...this.goals, newGoal];
            console.log('GoalsStore: Goal added, now', this.goals.length, 'goals');
            return newGoal;
        },

        async addTaskToGoal(goalId: string, taskId: string) {
            const goal = this.goals.find(g => g.id === goalId);
            if (goal) {
                goal.tasks.push(taskId);
                await this.updateGoal(goal);
                console.log('GoalsStore: Task added to goal', goalId);
            }
        },

        async removeTaskFromGoal(goalId: string, taskId: string) {
            const goal = this.goals.find(g => g.id === goalId);
            if (goal) {
                goal.tasks = goal.tasks.filter(id => id !== taskId);
                await this.updateGoal(goal);
                console.log('GoalsStore: Task removed from goal', goalId);
            }
        }
    }
}); 