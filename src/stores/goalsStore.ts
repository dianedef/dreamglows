import { defineStore } from 'pinia';
import type { Goal } from '@/types/goals';
import { GoalsService } from '@/services/GoalsService';
import { StorageService } from '@/services/StorageService';
import { Notice } from 'obsidian';

interface GoalsState {
    goals: Goal[];
    goalsService: GoalsService | null;
    storageService: StorageService | null;
    isLoading: boolean;
    lastLoadTime: number | null;
    isInitialized: boolean;
}

export const useGoalsStore = defineStore('goals', {
    state: (): GoalsState => ({
        goals: [],
        goalsService: null,
        storageService: null,
        isLoading: false,
        lastLoadTime: null,
        isInitialized: false
    }),

    getters: {
        categories: (state) => {
            const categories = new Set(state.goals.map(g => g.category || 'Sans catégorie'));
            return Array.from(categories);
        }
    },

    actions: {
        async initializeService(app: any) {
            console.log('GoalsStore: Initializing service');
            if (this.isInitialized) {
                console.log('GoalsStore: Already initialized');
                return;
            }
            
            this.goalsService = new GoalsService(app);
            this.storageService = new StorageService(app);
            console.log('GoalsStore: Services created');
            
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
            if (!this.storageService) {
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
                const { goals } = await this.storageService.loadData();
                console.log('GoalsStore: Goals loaded:', goals);
                this.goals = goals;
                this.lastLoadTime = now;
            } catch (error) {
                console.error('GoalsStore: Error loading goals:', error);
                new Notice('Erreur lors du chargement des objectifs');
            } finally {
                this.isLoading = false;
                console.log('GoalsStore: Load complete');
            }
        },

        async saveGoals() {
            if (!this.storageService) return;
            await this.storageService.saveData(this.goals, []); // On passe un tableau vide pour les tasks
        },

        async addGoal(goalData: Partial<Goal>) {
            const newGoal: Goal = {
                id: crypto.randomUUID(),
                title: goalData.title || '',
                description: goalData.description || '',
                startDate: goalData.startDate || new Date().toISOString().split('T')[0],
                dueDate: goalData.dueDate,
                status: goalData.status || 'todo',
                priority: goalData.priority || 'medium',
                category: goalData.category,
                progress: goalData.progress || 0,
                tags: goalData.tags || [],
                tasks: goalData.tasks || [],
                subGoalIds: goalData.subGoalIds || []
            };
            this.goals.push(newGoal);
            await this.saveGoals();
            new Notice('Objectif ajouté avec succès');
        },

        async updateGoal(goalData: Partial<Goal> & { id: string }) {
            const index = this.goals.findIndex(g => g.id === goalData.id);
            if (index !== -1) {
                this.goals[index] = {
                    ...this.goals[index],
                    ...goalData
                };
                await this.saveGoals();
                new Notice('Objectif mis à jour avec succès');
            }
        },

        async deleteGoal(goalId: string) {
            if (!this.storageService) return;
            const index = this.goals.findIndex(g => g.id === goalId);
            if (index !== -1) {
                this.goals.splice(index, 1);
                await this.saveGoals();
                new Notice('Objectif supprimé avec succès');
            }
        },

        async updateCategory(oldName: string, newName: string) {
            console.log('GoalsStore: Updating category', { oldName, newName });
            
            try {
                // Mettre à jour tous les objectifs de cette catégorie
                const goalsToUpdate = this.goals.filter(g => g.category === oldName);
                
                for (const goal of goalsToUpdate) {
                    const updatedGoal = {
                        ...goal,
                        category: newName
                    };
                    const index = this.goals.findIndex(g => g.id === goal.id);
                    if (index !== -1) {
                        this.goals[index] = updatedGoal;
                    }
                }
                
                await this.saveGoals();
                new Notice('Catégorie renommée avec succès');
                console.log('GoalsStore: Category updated');
            } catch (error) {
                console.error('Error updating category:', error);
                new Notice('Erreur lors du renommage de la catégorie');
            }
        },

        async deleteCategory(categoryName: string) {
            console.log('GoalsStore: Deleting category', { categoryName });
            
            try {
                // Déplacer tous les objectifs vers "Sans catégorie"
                const goalsToUpdate = this.goals.filter(g => g.category === categoryName);
                
                for (const goal of goalsToUpdate) {
                    await this.goalsService?.saveGoal({
                        ...goal,
                        category: 'Sans catégorie'
                    });
                }
                
                // Recharger pour s'assurer de la cohérence
                await this.loadGoals(true);
                
                new Notice('Catégorie supprimée avec succès');
                console.log('GoalsStore: Category deleted');
            } catch (error) {
                console.error('Error deleting category:', error);
                new Notice('Erreur lors de la suppression de la catégorie');
            }
        }
    }
}); 