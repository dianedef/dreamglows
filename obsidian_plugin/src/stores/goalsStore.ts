import { defineStore } from 'pinia';
import { Goal, GoalChain, GoalTimeframe } from '../types/goals';
import { GoalChainService } from '../services/GoalChainService';
import { useProgressionStore } from './progressionStore';

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
        addGoal(goal: Omit<Goal, 'id'>) {
            const newGoal: Goal = {
                ...goal,
                id: crypto.randomUUID()
            };
            this.goals.push(newGoal);
            return newGoal;
        },

        setGoals(goals: Goal[]) {
            this.goals = [...goals];
        },

        createGoal(goal: Goal) {
            this.goals.push({ ...goal });
        },

        updateGoal(idOrGoal: string | Goal, updates?: Partial<Goal>) {
            const goalId = typeof idOrGoal === 'string' ? idOrGoal : idOrGoal.id;
            const patch: Partial<Goal> = typeof idOrGoal === 'string'
                ? updates || {}
                : (idOrGoal as Partial<Goal>);
            const index = this.goals.findIndex(goal => goal.id === goalId);
            if (index !== -1) {
                const previousGoal = this.goals[index];
                const wasDone = previousGoal.status === 'done';
                const isDone = patch.status === 'done';
                const updatedGoal: Goal = {
                    ...previousGoal,
                    ...patch
                };
                this.goals[index] = updatedGoal;
                if (!wasDone && isDone) {
                    const progressionStore = useProgressionStore();
                    progressionStore.rewardGoalCompletion(previousGoal.id);
                }
            }
        },

        deleteGoal(id: string) {
            const index = this.goals.findIndex(goal => goal.id === id);
            if (index !== -1) {
                // Supprimer également tous les sous-objectifs
                const childGoals = this.getChildGoals(id);
                childGoals.forEach(child => this.deleteGoal(child.id));
                this.goals.splice(index, 1);
            }
        },

        createChain(mainGoal: Goal) {
            const goalChainService = new GoalChainService();
            const newChain = goalChainService.createGoalChain(mainGoal);
            this.chains.push(newChain);
            return newChain;
        },

        decomposeGoal(goalId: string, targetTimeframe: GoalTimeframe) {
            const goal = this.getGoalById(goalId);
            if (!goal) return;

            const goalChainService = new GoalChainService();
            const subGoals = goalChainService.decomposeGoal(goal, targetTimeframe);
            
            subGoals.forEach(subGoal => {
                this.addGoal(subGoal);
            });

            return subGoals;
        },

        addTaskToGoal(goalId: string, taskId: string) {
            const goal = this.getGoalById(goalId);
            if (!goal) {
                return;
            }
            const currentTasks = Array.isArray((goal as any).tasks) ? [...(goal as any).tasks] : [];
            if (!currentTasks.includes(taskId)) {
                currentTasks.push(taskId);
                const index = this.goals.findIndex(item => item.id === goalId);
                if (index !== -1) {
                    this.goals[index] = { ...goal, tasks: currentTasks as string[] } as unknown as Goal;
                }
            }
        },

        removeTaskFromGoal(goalId: string, taskId: string) {
            const goal = this.getGoalById(goalId);
            if (!goal) {
                return;
            }
            const currentTasks = Array.isArray((goal as any).tasks) ? [...(goal as any).tasks] : [];
            const filteredTasks = currentTasks.filter((id) => id !== taskId);
            if (filteredTasks.length !== currentTasks.length) {
                const index = this.goals.findIndex(item => item.id === goalId);
                if (index !== -1) {
                    this.goals[index] = { ...goal, tasks: filteredTasks as string[] } as unknown as Goal;
                }
            }
        },

        updateProgress(goalId: string, progress: number) {
            this.updateGoal(goalId, { progress });
            
            // Mettre à jour la progression du parent si nécessaire
            const goal = this.getGoalById(goalId);
            if (goal?.parentGoalId) {
                const parentGoal = this.getGoalById(goal.parentGoalId);
                if (parentGoal) {
                    const childGoals = this.getChildGoals(parentGoal.id);
                    const totalProgress = childGoals.reduce((sum, child) => sum + child.progress, 0);
                    const averageProgress = totalProgress / childGoals.length;
                    this.updateGoal(parentGoal.id, { progress: averageProgress });
                }
            }
        },

        setSelectedGoal(goalId: string | null) {
            this.selectedGoalId = goalId;
        },

        setSelectedChain(chainId: string | null) {
            this.selectedChainId = chainId;
        }
    }
}); 
