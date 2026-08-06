<template>
  <div class="goalflowz-profile-view">
    <section class="goalflowz-profile-summary">
      <h2>Profil Orbit-like</h2>
      <div class="goalflowz-profile-grid">
        <article class="goalflowz-profile-card">
          <h3>Niveau</h3>
          <div class="goalflowz-profile-value">{{ progression.level }}</div>
          <div class="goalflowz-profile-sub">{{ progression.xp }} XP / {{ progression.xpToNext }} XP</div>
          <div class="goalflowz-profile-progress-wrap">
            <div class="goalflowz-profile-progress" :style="{ width: `${progression.levelProgressPercent}%` }"></div>
          </div>
        </article>

        <article class="goalflowz-profile-card">
          <h3>💰 Récompense</h3>
          <div class="goalflowz-profile-value">{{ progression.gold }} 🪙</div>
          <div class="goalflowz-profile-sub">Total XP accumulé : {{ progression.totalXp }}</div>
        </article>

        <article class="goalflowz-profile-card">
          <h3>🔥 Streak</h3>
          <div class="goalflowz-profile-value">{{ progression.streak }} jours</div>
          <div class="goalflowz-profile-sub">Meilleur streak : {{ progression.bestStreak }}</div>
        </article>
      </div>
    </section>

    <section class="goalflowz-profile-section">
      <h3>Répartition des gains</h3>
      <ul class="goalflowz-profile-breakdown">
        <li v-for="item in rewardBySource" :key="item.source">
          <span>{{ item.label }}</span>
          <span>{{ item.count }} gains · {{ item.xp }} XP · {{ item.gold }} 🪙</span>
        </li>
      </ul>
      <p v-if="!rewardBySource.length" class="goalflowz-profile-empty">Aucun gain enregistré pour le moment.</p>
    </section>

    <section class="goalflowz-profile-section">
      <h3>Historique récent</h3>
      <ul class="goalflowz-profile-rewards">
        <li v-for="reward in recentRewards" :key="`${reward.source}-${reward.sourceId}-${reward.date}`">
          <span class="goalflowz-profile-reward-message">{{ reward.message }}</span>
          <span class="goalflowz-profile-reward-date">{{ formatRewardDate(reward.date) }}</span>
        </li>
      </ul>
      <p v-if="!recentRewards.length" class="goalflowz-profile-empty">Aucun gain récent.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DateTime } from 'luxon';
import { useProgressionStore } from '@/stores/progressionStore';
import type { RewardEvent } from '@/types/settings';

const progressionStore = useProgressionStore();

const progression = computed(() => ({
  level: progressionStore.level,
  xp: progressionStore.xp,
  xpToNext: progressionStore.xpToNext,
  gold: progressionStore.gold,
  totalXp: progressionStore.totalXp,
  streak: progressionStore.streak,
  bestStreak: progressionStore.bestStreak,
  levelProgressPercent: progressionStore.levelProgressPercent
}));

const recentRewards = computed(() => progressionStore.recentRewardHistory.slice(0, 8));

const rewardBySource = computed(() => {
  const totals: Record<RewardEvent['source'], { label: string; count: number; xp: number; gold: number }> = {
    task: { label: 'Tâches', count: 0, xp: 0, gold: 0 },
    goal: { label: 'Objectifs', count: 0, xp: 0, gold: 0 },
    habit: { label: 'Habitudes', count: 0, xp: 0, gold: 0 },
    milestone: { label: 'Niveaux', count: 0, xp: 0, gold: 0 }
  };

  for (const reward of progressionStore.rewardHistory) {
    const bucket = totals[reward.source];
    if (!bucket) {
      continue;
    }

    bucket.count += 1;
    bucket.xp += reward.xp;
    bucket.gold += reward.gold;
  }

  return Object.entries(totals)
    .map(([source, stats]) => ({
      source,
      label: stats.label,
      count: stats.count,
      xp: stats.xp,
      gold: stats.gold
    }))
    .filter((item) => item.count > 0);
});

const formatRewardDate = (date: string) => {
  try {
    return DateTime.fromISO(date).setLocale('fr').toLocaleString({ day: 'numeric', month: 'short' });
  } catch {
    return date;
  }
};
</script>
