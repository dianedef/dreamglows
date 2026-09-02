<template>
  <main class="path-stats" data-dg-stats>
    <header><div><p class="dreamglows-kicker">Chemin</p><h2>Statistiques</h2><p>Ce rapport mesure les faits durables. Humeur, énergie et habitudes restent dans Aujourd'hui.</p></div><fieldset><legend>Période</legend><button v-for="period in periods" :key="period" type="button" :aria-pressed="selectedPeriod===period" :data-dg-stats-period="period" @click="selectedPeriod=period">{{ period }} j</button></fieldset></header>
    <p class="sr-only" aria-live="polite">Rapport sur {{ selectedPeriod }} jours, {{ totalFacts }} faits.</p>
    <div v-if="!stats" data-dg-stats-loading role="status">Chargement des faits…</div>
    <template v-else>
      <section class="stats-summary" data-dg-stats-summary aria-labelledby="stats-summary-title"><h3 id="stats-summary-title">Vue d'ensemble</h3><dl>
        <div data-dg-stat="completed"><dt>Réalisations</dt><dd>{{ stats.totals.completed }}</dd></div>
        <div data-dg-stat="evidence"><dt>Preuves</dt><dd>{{ stats.totals.evidence }}</dd></div>
        <div data-dg-stat="reflections"><dt>Réflexions</dt><dd>{{ stats.totals.reflection }}</dd></div>
        <div data-dg-stat="adjustments"><dt>Réouvertures</dt><dd>{{ stats.totals.reopened }}</dd></div>
        <div data-dg-stat="depth"><dt>Profondeur maximale</dt><dd>{{ stats.hierarchy.maxDepth }}</dd></div>
      </dl></section>
      <section class="stats-current" aria-labelledby="stats-current-title"><h3 id="stats-current-title">État actuel</h3><p><strong>{{ stats.currentGoals.done }}/{{ stats.currentGoals.total }}</strong> objectifs accomplis · <strong>{{ stats.currentActions.done }}/{{ stats.currentActions.total }}</strong> actions accomplies</p><p v-if="stats.hierarchy.cyclicEntities||stats.hierarchy.orphanEntities" role="status">{{ stats.hierarchy.cyclicEntities }} relation(s) cyclique(s) · {{ stats.hierarchy.orphanEntities }} orpheline(s)</p></section>
      <div v-if="!totalFacts" class="stats-empty" data-dg-stats-empty role="status"><strong>Aucun fait durable sur cette période.</strong><p>Les réalisations, preuves, réflexions et réouvertures apparaîtront ici.</p></div>
      <div v-else class="stats-table-wrap"><table data-dg-stats-daily><caption>Activité quotidienne du {{ formatDate(stats.range.start) }} au {{ formatDate(stats.range.endInclusive) }}</caption><thead><tr><th scope="col">Date</th><th scope="col">Créations</th><th scope="col">Réalisations</th><th scope="col">Preuves</th><th scope="col">Réflexions</th><th scope="col">Réouvertures</th></tr></thead><tbody><tr v-for="day in activeDays" :key="day.date" :data-dg-stats-day="day.date"><th scope="row"><time :datetime="day.date">{{ formatDate(day.date) }}</time></th><td>{{ day.created }}</td><td>{{ day.completed }}</td><td>{{ day.evidence }}</td><td>{{ day.reflection }}</td><td>{{ day.reopened }}</td></tr></tbody></table></div>
    </template>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { computePathStatistics } from '@/domain/path/statistics';
import type { CivilDate } from '@/domain/path/model';
import { usePathStore } from '@/stores/pathStore';
type Period=7|30|90|365;
const periods:readonly Period[]=[7,30,90,365]; const selectedPeriod=ref<Period>(30); const pathStore=usePathStore();
const addDays=(value:CivilDate,days:number)=>{const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10) as CivilDate};
const stats=computed(()=>pathStore.document?computePathStatistics(pathStore.document.envelope,{start:addDays(pathStore.referenceDate,1-selectedPeriod.value),endInclusive:pathStore.referenceDate}):undefined);
const totalFacts=computed(()=>stats.value?Object.values(stats.value.totals).reduce((sum,value)=>sum+value,0):0);
const activeDays=computed(()=>[...(stats.value?.daily??[])].reverse().filter(day=>day.created+day.completed+day.reopened+day.evidence+day.reflection>0));
const formatDate=(value:CivilDate)=>new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00Z`));
</script>
<style scoped>
.path-stats{padding:1.25rem;color:var(--text-normal)}.path-stats header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.path-stats h2,.path-stats header p{margin:.2rem 0}.path-stats header p:last-child{color:var(--text-muted)}fieldset{display:flex;gap:.35rem;border:0;padding:0}legend{font-size:.75rem;color:var(--text-muted)}fieldset button{min-height:44px}button[aria-pressed=true]{background:var(--interactive-accent);color:var(--text-on-accent)}.stats-summary,.stats-current,.stats-empty,.stats-table-wrap{margin-top:1rem;padding:1rem;border:1px solid var(--background-modifier-border);border-radius:12px;background:var(--background-primary-alt)}.stats-summary h3,.stats-current h3{margin-top:0}.stats-summary dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:.65rem}.stats-summary dl div{padding:.75rem;border-radius:9px;background:var(--background-secondary)}dt{color:var(--text-muted)}dd{margin:.2rem 0 0;font-size:1.6rem;font-weight:700}.stats-table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse}caption{text-align:left;font-weight:600;margin-bottom:.75rem}th,td{padding:.55rem;border-bottom:1px solid var(--background-modifier-border);text-align:left}.stats-empty{text-align:center}@media(max-width:650px){.path-stats header{display:grid}fieldset{flex-wrap:wrap}}
</style>
