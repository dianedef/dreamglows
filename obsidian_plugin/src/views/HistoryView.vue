<template>
  <div class="dreamglows-history-view" data-dg-history-content>
    <header class="history-header"><div><p class="dreamglows-kicker">Histoire</p><h2>Ce qui s'est réellement passé</h2><p>Les faits durables restent distincts de ce qui était simplement planifié.</p></div><nav class="history-navigation" aria-label="Naviguer dans l'historique"><button type="button" aria-label="Semaine précédente" @click="moveWeek(-1)">←</button><button type="button" @click="goToday">Aujourd'hui</button><button type="button" aria-label="Semaine suivante" @click="moveWeek(1)">→</button></nav></header>
    <p class="history-period" aria-live="polite">Du {{ formatCivil(range?.start) }} au {{ formatCivil(range?.end) }}</p>
    <div v-if="!pathStore.document" class="dreamglows-history-empty"><strong>Chargement de l'histoire…</strong></div>
    <div v-else class="history-layout">
      <div class="history-events">
        <template v-if="groups.length"><section v-for="group in groups" :key="group.date" class="history-day"><h3>{{ formatCivil(group.date, true) }}</h3><ol class="dreamglows-history-list" :aria-label="`Événements du ${formatCivil(group.date, true)}`">
          <li v-for="row in group.rows" :key="row.id" class="dreamglows-history-item" :class="{ 'is-selected': row.selected }" :data-dg-history-event-id="row.id" :data-dg-entity-id="row.target.id" :data-dg-related-entity-id="row.relatedEntity?.id"><time :datetime="row.event.occurredAt">{{ formatInstant(row.event.occurredAt) }}</time><div class="history-copy"><strong>{{ row.label }}</strong><span>{{ row.target.title }}</span><dl v-if="row.changes.length" class="history-changes"><template v-for="change in row.changes" :key="change.field"><dt>{{ change.label }}</dt><dd><span v-if="change.before">{{ change.before }} → </span>{{ change.after }}</dd></template></dl><div class="history-actions"><button type="button" @click="select(row.target.id)">Ouvrir {{ row.target.title }}</button><button v-if="row.relatedEntity" type="button" @click="select(row.relatedEntity.id)">Ouvrir {{ row.relatedEntity.title }}</button></div></div></li>
        </ol></section></template>
        <div v-else class="dreamglows-history-empty"><strong>Aucun événement durable cette semaine.</strong><p>Une planification, une réalisation, une preuve ou une réflexion apparaîtra ici.</p><button type="button" @click="goToday">Revenir à aujourd'hui</button></div>
      </div><PathDetailPanel class="history-detail" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import PathDetailPanel from '@/components/PathDetailPanel.vue';
import { historyViewRows, type HistoryRow } from '@/domain/path/history-view-model';
import { usePathStore } from '@/stores/pathStore';
const pathStore=usePathStore(); const projection=computed(()=>pathStore.historyProjection); const range=computed(()=>projection.value?.range);
const rows=computed(()=>projection.value&&pathStore.document?historyViewRows(projection.value,pathStore.document.envelope):[]);
const parisDay=(instant:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));
const groups=computed(()=>{const result=new Map<string,HistoryRow[]>();for(const row of [...rows.value].reverse()){const date=parisDay(row.event.occurredAt);const group=result.get(date)??[];group.push(row);result.set(date,group)}return[...result].map(([date,groupRows])=>({date,rows:groupRows}))});
const formatCivil=(value?:string,weekday=false)=>value?new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',...(weekday?{weekday:'long' as const}:{}),day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00Z`)):'…';
const formatInstant=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Heure indisponible':new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(date)};
const addDays=(value:string,days:number)=>{const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)};
const moveWeek=(direction:number)=>pathStore.setReferenceDate(addDays(pathStore.referenceDate,direction*7)); const goToday=()=>pathStore.setReferenceInstant(new Date().toISOString()); const select=(id:string)=>pathStore.select(id);
</script>
<style scoped>
.dreamglows-history-view{padding:1.25rem;color:var(--text-normal)}.history-header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.history-header h2,.history-header p{margin:.15rem 0 .35rem}.history-header>div>p:last-child,.history-period{color:var(--text-muted)}.history-navigation,.history-actions{display:flex;gap:.4rem}.history-period{margin:.8rem 0}.history-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.6fr);gap:.8rem;min-height:420px}.history-events,.history-detail{min-width:0;border:1px solid var(--background-modifier-border);border-radius:12px;background:var(--background-primary-alt)}.history-events{padding:1rem;overflow:auto}.history-day h3{margin:1rem 0 .5rem;text-transform:capitalize}.dreamglows-history-list{display:grid;gap:.65rem;padding:0;list-style:none}.dreamglows-history-item{display:grid;grid-template-columns:minmax(70px,auto) 1fr;gap:1rem;padding:.8rem;border:1px solid var(--background-modifier-border);border-radius:10px;background:var(--background-secondary)}.dreamglows-history-item.is-selected{border-color:var(--interactive-accent)}.dreamglows-history-item time{color:var(--text-muted);font-size:.82rem}.history-copy{display:grid;gap:.35rem}.history-changes{display:grid;grid-template-columns:auto 1fr;gap:.2rem .7rem;margin:.25rem 0;font-size:.82rem}.history-changes dt{color:var(--text-muted)}.history-changes dd{margin:0}.history-actions{flex-wrap:wrap;margin-top:.25rem}.history-actions button{font-size:.78rem}.dreamglows-history-empty{padding:2rem;text-align:center;border:1px dashed var(--background-modifier-border);border-radius:12px}@media(max-width:760px){.history-header{display:grid}.history-layout{grid-template-columns:1fr}.history-detail{min-height:320px}.dreamglows-history-item{grid-template-columns:1fr;gap:.3rem}}
</style>
