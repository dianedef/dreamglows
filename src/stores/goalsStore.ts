import { defineStore } from 'pinia';
import type { Goal } from '@/types/goals';

interface GoalsState {
    goals: Goal[];
}

export const useGoalsStore = defineStore('goals', {
    state: (): GoalsState => ({
        goals: []
    }),

    actions: {
        addGoal(goal: Goal) {
            this.goals.push(goal);
        },
        
        updateGoal(updatedGoal: Goal) {
            const index = this.goals.findIndex(g => g.id === updatedGoal.id);
            if (index !== -1) {
                this.goals[index] = updatedGoal;
            }
        },
        
        deleteGoal(goalId: string) {
            this.goals = this.goals.filter(g => g.id !== goalId);
        },
        
        setGoals(goals: Goal[]) {
            this.goals = goals;
        }
    }
}); 