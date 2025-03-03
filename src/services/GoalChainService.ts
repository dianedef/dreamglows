import { Goal, GoalChain, GoalTimeframe, GoalStatus } from '../types/goals';
import { DateService } from './DateService';

export class GoalChainService {
    private dateService: DateService;

    constructor() {
        this.dateService = new DateService();
    }

    /**
     * Crée une nouvelle chaîne d'objectifs à partir d'un objectif principal
     */
    createGoalChain(mainGoal: Goal): GoalChain {
        return {
            id: crypto.randomUUID(),
            mainGoalId: mainGoal.id,
            subGoals: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Décompose un objectif en sous-objectifs selon le timeframe spécifié
     */
    decomposeGoal(goal: Goal, targetTimeframe: GoalTimeframe): Goal[] {
        const subGoals: Goal[] = [];
        const duration = this.calculateDuration(goal.startDate, goal.endDate);
        
        switch (targetTimeframe) {
            case GoalTimeframe.YEARLY:
                // Décompose un objectif 5/10 ans en objectifs annuels
                for (let i = 0; i < duration.years; i++) {
                    subGoals.push(this.createSubGoal(goal, targetTimeframe, i));
                }
                break;
            case GoalTimeframe.QUARTERLY:
                // Décompose un objectif annuel en trimestres
                const quarters = duration.years * 4;
                for (let i = 0; i < quarters; i++) {
                    subGoals.push(this.createSubGoal(goal, targetTimeframe, i));
                }
                break;
            // Ajouter d'autres cas selon les besoins
        }

        return subGoals;
    }

    /**
     * Calcule la progression d'une chaîne d'objectifs
     */
    calculateChainProgress(chain: GoalChain): number {
        if (chain.subGoals.length === 0) return 0;

        const totalProgress = chain.subGoals.reduce(
            (sum, goal) => sum + goal.progress,
            0
        );

        return totalProgress / chain.subGoals.length;
    }

    private createSubGoal(parentGoal: Goal, timeframe: GoalTimeframe, index: number): Goal {
        const startDate = this.calculateStartDate(parentGoal.startDate, timeframe, index);
        const endDate = this.calculateEndDate(startDate, timeframe);

        return {
            id: crypto.randomUUID(),
            title: `${parentGoal.title} - ${timeframe} ${index + 1}`,
            description: `Sous-objectif de: ${parentGoal.title}`,
            timeframe: timeframe,
            status: GoalStatus.NOT_STARTED,
            progress: 0,
            parentGoalId: parentGoal.id,
            startDate,
            endDate,
            metrics: []
        };
    }

    private calculateDuration(startDate: Date, endDate: Date) {
        const years = endDate.getFullYear() - startDate.getFullYear();
        const months = endDate.getMonth() - startDate.getMonth();
        return { years, months };
    }

    private calculateStartDate(baseDate: Date, timeframe: GoalTimeframe, index: number): Date {
        const date = new Date(baseDate);
        switch (timeframe) {
            case GoalTimeframe.YEARLY:
                date.setFullYear(date.getFullYear() + index);
                break;
            case GoalTimeframe.QUARTERLY:
                date.setMonth(date.getMonth() + (index * 3));
                break;
            // Ajouter d'autres cas selon les besoins
        }
        return date;
    }

    private calculateEndDate(startDate: Date, timeframe: GoalTimeframe): Date {
        const endDate = new Date(startDate);
        switch (timeframe) {
            case GoalTimeframe.YEARLY:
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            case GoalTimeframe.QUARTERLY:
                endDate.setMonth(endDate.getMonth() + 3);
                break;
            // Ajouter d'autres cas selon les besoins
        }
        return endDate;
    }
} 