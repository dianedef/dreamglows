import { defineStore } from 'pinia';
import type { Goal } from '@/types/goals';
import { GoalsService } from '@/services/GoalsService';
import { Notice } from 'obsidian';

interface GoalsState {
    goals: Goal[];
    goalsService: GoalsService | null;
    isLoading: boolean;
    lastLoadTime: number | null;
    isInitialized: boolean;
}

export const useGoalsStore = defineStore('goals', {
    state: (): GoalsState => ({
        goals: [],
        goalsService: null,
        isLoading: false,
        lastLoadTime: null,
        isInitialized: false
    }),

    actions: {
        async initializeService(app: any) {
            console.log('GoalsStore: Initializing service');
            if (this.isInitialized) {
                console.log('GoalsStore: Already initialized');
                return;
            }
            
            this.goalsService = new GoalsService(app);
            console.log('GoalsStore: Service created');
            
            try {
                await this.loadGoals(true);
                this.isInitialized = true;
                console.log('GoalsStore: Initialization complete');
            } catch (error) {
                console.error('GoalsStore: Failed to initialize goals service:', error);
                new Notice('Erreur lors de l\'initialisation du service des objectifs');
            }
        },

        async loadGoals(force = false) {
            console.log('GoalsStore: Loading goals, force =', force);
            if (!this.goalsService) {
                console.log('GoalsStore: No service available');
                return;
            }
            
            const now = Date.now();
            if (!force && this.lastLoadTime && (now - this.lastLoadTime < 1000)) {
                console.log('GoalsStore: Skipping load, too soon');
                return;
            }

            if (this.isLoading) {
                console.log('GoalsStore: Already loading');
                return;
            }

            try {
                this.isLoading = true;
                console.log('GoalsStore: Starting load');
                const loadedGoals = await this.goalsService.loadGoals();
                console.log('GoalsStore: Goals loaded:', loadedGoals);
                this.goals = loadedGoals;
                this.lastLoadTime = now;
            } catch (error) {
                console.error('GoalsStore: Error loading goals:', error);
                new Notice('Erreur lors du chargement des objectifs');
            } finally {
                this.isLoading = false;
                console.log('GoalsStore: Load complete');
            }
        },

        async addGoal(goal: Goal) {
            console.log('GoalsStore: TEST - Simplification addGoal');
            try {
                // Test 1 : On ajoute juste en mémoire sans sauvegarder
                this.goals.push(goal);
                console.log('GoalsStore: Goal added to memory only');
                new Notice('TEST - Objectif ajouté en mémoire uniquement');
            } catch (error) {
                console.error('GoalsStore: Error in simplified addGoal:', error);
                new Notice('TEST - Erreur lors du test');
            }
        },

        async updateGoal(updatedGoal: Goal) {
            if (!this.goalsService) return;
            try {
                await this.goalsService.saveGoal(updatedGoal);
                const index = this.goals.findIndex(g => g.id === updatedGoal.id);
                if (index !== -1) {
                    this.goals[index] = updatedGoal;
                }
                new Notice('Objectif mis à jour avec succès');
                await this.loadGoals(true);  // Recharger pour s'assurer de la cohérence
            } catch (error) {
                console.error('Error updating goal:', error);
                new Notice('Erreur lors de la mise à jour de l\'objectif');
            }
        },

        async deleteGoal(goalId: string) {
            if (!this.goalsService) return;
            try {
                await this.goalsService.deleteGoal(goalId);
                this.goals = this.goals.filter(g => g.id !== goalId);
                new Notice('Objectif supprimé avec succès');
                await this.loadGoals(true);  // Recharger pour s'assurer de la cohérence
            } catch (error) {
                console.error('Error deleting goal:', error);
                new Notice('Erreur lors de la suppression de l\'objectif');
            }
        }
    }
}); 