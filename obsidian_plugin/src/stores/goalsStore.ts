import { defineStore } from 'pinia';
import { Goal, GoalChain, GoalTimeframe } from '../types/goals';

interface GoalsState {
    goals: Goal[];
    chains: GoalChain[];
    selectedGoalId: string | null;
    selectedChainId: string | null;
}

export const useGoalsStore = defineStore('goals', {
    state: (): GoalsState => ({
        goals: [],
        chains: [],
        selectedGoalId: null,
        selectedChainId: null
    }),

    getters: {
        getGoalsByTimeframe: (state) => {
            return (timeframe: GoalTimeframe) => 
                state.goals.filter(goal => goal.timeframe === timeframe);
        },

        getGoalById: (state) => {
            return (id: string) => state.goals.find(goal => goal.id === id);
        },

        getChainById: (state) => {
            return (id: string) => state.chains.find(chain => chain.id === id);
        },

        selectedGoal: (state) => {
            return state.selectedGoalId 
                ? state.goals.find(goal => goal.id === state.selectedGoalId)
                : null;
        },

        selectedChain: (state) => {
            return state.selectedChainId
                ? state.chains.find(chain => chain.id === state.selectedChainId)
                : null;
        },

        getChildGoals: (state) => {
            return (parentId: string) => 
                state.goals.filter(goal => goal.parentGoalId === parentId);
        }
    },

    actions: {
        setGoals(goals: Goal[]) {
            this.goals = [...goals];
        },

        setSelectedGoal(goalId: string | null) {
            this.selectedGoalId = goalId;
        },

        setSelectedChain(chainId: string | null) {
            this.selectedChainId = chainId;
        }
    }
}); 
