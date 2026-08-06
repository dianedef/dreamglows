import { DateTime } from 'luxon';
import { defineStore } from 'pinia';
import { DEFAULT_GAME_PROGRESSION, type GameProgression, type RewardEvent } from '../types/settings';
import { useSettingsStore } from './settingsStore';

const REWARD_POINTS = {
    task: { xp: 20, gold: 2 },
    goal: { xp: 60, gold: 8 },
    habit: { xp: 12, gold: 1 }
};

const MILESTONE_BONUSES: Record<number, { xp: number; gold: number }> = {
    5: { xp: 25, gold: 10 },
    10: { xp: 50, gold: 25 },
    20: { xp: 100, gold: 50 }
};

const XP_TO_NEXT_LEVEL = 100;
const LEVEL_GROWTH = 35;

const getXpToNextLevel = (level: number): number => {
    return XP_TO_NEXT_LEVEL + (Math.max(level - 1, 0) * LEVEL_GROWTH);
};

interface ProgressState {
    gameProgression: GameProgression;
}

const cloneRewardMap = (source: Record<string, string[]>) => {
    const copy: Record<string, string[]> = {};
    Object.keys(source).forEach((date) => {
        copy[date] = [...source[date]];
    });
    return copy;
};

const cloneRewardHistory = (source: RewardEvent[] = []) => {
    return source.map((reward) => ({ ...reward }));
};

type RewardSource = 'task' | 'goal' | 'habit' | 'milestone';

export const useProgressionStore = defineStore('progression', {
    state: (): ProgressState => ({
        gameProgression: {
            ...DEFAULT_GAME_PROGRESSION,
            rewardedByDate: {},
            rewardHistory: [...DEFAULT_GAME_PROGRESSION.rewardHistory]
        }
    }),

    getters: {
        level: (state) => state.gameProgression.level,
        xp: (state) => state.gameProgression.xp,
        totalXp: (state) => state.gameProgression.totalXp,
        gold: (state) => state.gameProgression.gold,
        streak: (state) => state.gameProgression.streak,
        bestStreak: (state) => state.gameProgression.bestStreak,
        xpToNext: (state) => getXpToNextLevel(state.gameProgression.level),
        rewardHistory: (state) => {
            return [...(state.gameProgression.rewardHistory || [])].sort((a, b) => {
                const dateA = DateTime.fromISO(a.date).toMillis();
                const dateB = DateTime.fromISO(b.date).toMillis();
                return dateB - dateA;
            });
        },
        recentRewardHistory: (state) => {
            return [...(state.gameProgression.rewardHistory || [])]
                .sort((a, b) => {
                    const dateA = DateTime.fromISO(a.date).toMillis();
                    const dateB = DateTime.fromISO(b.date).toMillis();
                    return dateB - dateA;
                })
                .slice(0, 4);
        },
        levelProgressPercent: (state) => {
            const xpToNext = getXpToNextLevel(state.gameProgression.level);
            return xpToNext > 0 ? Math.min(Math.round((state.gameProgression.xp / xpToNext) * 100), 100) : 0;
        },
        currentDateKey: () => DateTime.now().toISODate()
    },

    actions: {
        hydrate(progress?: Partial<GameProgression>) {
            const safeProgression: GameProgression = {
                ...DEFAULT_GAME_PROGRESSION,
                ...(progress || {}),
                rewardedByDate: {
                    ...cloneRewardMap(progress?.rewardedByDate || {})
                },
                rewardHistory: cloneRewardHistory(progress?.rewardHistory || [])
            };
            this.gameProgression = safeProgression;
            this.syncSettings();
        },

        rewardTaskCompletion(taskId: string) {
            return this.reward({
                source: 'task',
                key: `task:${taskId}`,
                xp: REWARD_POINTS.task.xp,
                gold: REWARD_POINTS.task.gold,
                title: 'Tâche complétée'
            });
        },

        rewardGoalCompletion(goalId: string) {
            return this.reward({
                source: 'goal',
                key: `goal:${goalId}`,
                xp: REWARD_POINTS.goal.xp,
                gold: REWARD_POINTS.goal.gold,
                title: 'Objectif atteint'
            });
        },

        rewardHabitCompletion(habitId: string, date = DateTime.now().toISODate()) {
            return this.reward({
                source: 'habit',
                key: `habit:${habitId}:${date}`,
                xp: REWARD_POINTS.habit.xp,
                gold: REWARD_POINTS.habit.gold,
                date,
                title: 'Habitude validée'
            });
        },

        reward({
            source,
            key,
            xp,
            gold,
            date = DateTime.now().toISODate(),
            title = 'Récompense'
        }: {
            source: RewardSource;
            key: string;
            xp: number;
            gold: number;
            date?: string;
            title?: string;
        }) {
            const rewardKey = `${source}:${key}`;
            const rewardsByDate = this.gameProgression.rewardedByDate || {};
            const rewardsForDate = new Set(rewardsByDate[date] || []);
            if (rewardsForDate.has(rewardKey)) {
                return;
            }

            rewardsForDate.add(rewardKey);
            rewardsByDate[date] = Array.from(rewardsForDate);
            this.gameProgression.rewardedByDate = rewardsByDate;

            this.appendReward({
                date,
                source,
                sourceId: key,
                title,
                xp,
                gold,
                message: this.getRewardMessage(title, xp, gold)
            });

            this.gameProgression.totalXp += xp;
            this.gameProgression.gold += gold;

            const previousLevel = this.gameProgression.level;
            this.gameProgression.xp += xp;
            this.processLevelProgression();
            this.checkMilestoneGifts(previousLevel, this.gameProgression.level);

            const currentDate = DateTime.now().toISODate();
            this.updateStreak(currentDate);
            this.gameProgression.lastActivityDate = date;
            this.pruneRewardHistory();
            this.syncSettings();
        },

        appendReward(event: {
            date: string;
            source: RewardSource;
            sourceId: string;
            title: string;
            xp: number;
            gold: number;
            message: string;
        }) {
            this.gameProgression.rewardHistory = [
                ...(this.gameProgression.rewardHistory || []),
                {
                    date: event.date,
                    source: event.source,
                    sourceId: event.sourceId,
                    title: event.title,
                    xp: event.xp,
                    gold: event.gold,
                    message: event.message
                }
            ];
        },

        checkMilestoneGifts(previousLevel: number, targetLevel: number) {
            if (targetLevel <= previousLevel) {
                return;
            }

            for (let level = previousLevel + 1; level <= targetLevel; level += 1) {
                const bonus = MILESTONE_BONUSES[level];
                if (!bonus) {
                    continue;
                }

                const sourceId = `milestone:${level}`;
                this.appendReward({
                    date: DateTime.now().toISODate(),
                    source: 'milestone',
                    sourceId,
                    title: `Niveau ${level} atteint`,
                    xp: bonus.xp,
                    gold: bonus.gold,
                    message: `🎉 Niveau ${level} atteint ! +${bonus.xp} XP et +${bonus.gold} 🪙`
                });

                this.gameProgression.totalXp += bonus.xp;
                this.gameProgression.gold += bonus.gold;
                this.gameProgression.xp += bonus.xp;
                this.processLevelProgression();
            }
        },

        processLevelProgression() {
            while (this.gameProgression.xp >= getXpToNextLevel(this.gameProgression.level)) {
                this.gameProgression.xp -= getXpToNextLevel(this.gameProgression.level);
                this.gameProgression.level += 1;
            }
        },

        getRewardMessage(title: string, xp: number, gold: number) {
            return `${title} (+${xp} XP, +${gold} 🪙)`;
        },

        updateStreak(activityDate: string) {
            const lastDate = this.gameProgression.lastActivityDate;
            if (!lastDate) {
                this.gameProgression.streak = 1;
                this.gameProgression.bestStreak = Math.max(this.gameProgression.bestStreak, 1);
                return;
            }

            const last = DateTime.fromISO(lastDate);
            const current = DateTime.fromISO(activityDate);
            const daysDifference = Math.floor(current.diff(last, 'days').days);

            if (daysDifference === 0) {
                return;
            }

            if (daysDifference === 1) {
                this.gameProgression.streak = Math.max(1, this.gameProgression.streak + 1);
            } else if (daysDifference > 1) {
                this.gameProgression.streak = 1;
            }

            if (this.gameProgression.streak > this.gameProgression.bestStreak) {
                this.gameProgression.bestStreak = this.gameProgression.streak;
            }
        },

        pruneRewardHistory() {
            const cutoff = DateTime.now().minus({ days: 90 });
            this.gameProgression.rewardedByDate = Object.entries(this.gameProgression.rewardedByDate || {}).reduce((acc, [date, rewards]) => {
                if (DateTime.fromISO(date) >= cutoff) {
                    acc[date] = rewards;
                }
                return acc;
            }, {} as Record<string, string[]>);

            this.gameProgression.rewardHistory = (this.gameProgression.rewardHistory || [])
                .filter((event) => DateTime.fromISO(event.date) >= cutoff)
                .sort((a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis())
                .slice(-80);
        },

        syncSettings() {
            const settingsStore = useSettingsStore();
            settingsStore.updateSettings({
                gameProgression: {
                    ...this.gameProgression,
                    rewardedByDate: cloneRewardMap(this.gameProgression.rewardedByDate || {}),
                    rewardHistory: cloneRewardHistory(this.gameProgression.rewardHistory || [])
                }
            });
        }
    }
});
