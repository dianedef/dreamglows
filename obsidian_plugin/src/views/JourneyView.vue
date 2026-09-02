<template>
  <div class="dreamglows-journey-view" data-dg-journey-view>
    <header class="journey-header"><div><h2>Parcours</h2><p>Du rêve à l'action, selon une seule hiérarchie.</p></div></header>
    <section class="journey-metrics" aria-label="Vue d'ensemble"><article><strong>{{ goals.length }}</strong><span>objectifs et jalons</span></article><article><strong>{{ actions.length }}</strong><span>actions</span></article><article><strong>{{ done.length }}</strong><span>éléments accomplis</span></article><article><strong>{{ unscheduled.length }}</strong><span>à planifier</span></article></section>
    <p v-if="projection?.selectionVisibility === 'filtered'" role="status">La sélection reste ouverte mais est masquée par les filtres.</p>
    <div class="journey-layout">
      <div id="dreamglows-journey-tree-panel" class="journey-tree-panel" :style="{ width: `${mainWidth}%` }"><PathJourneyTree :items="rows" :selected-id="pathStore.selectedId" @select="select" /></div>
      <div class="journey-resizer" role="separator" aria-label="Redimensionner les panneaux" aria-orientation="vertical" aria-controls="dreamglows-journey-tree-panel dreamglows-journey-detail-panel" aria-valuemin="35" aria-valuemax="70" :aria-valuenow="Math.round(mainWidth)" tabindex="0" @mousedown="startResize" @keydown.left.prevent="resizeBy(-5)" @keydown.right.prevent="resizeBy(5)" />
      <PathDetailPanel id="dreamglows-journey-detail-panel" class="journey-detail-panel" :style="{ width: `${100-mainWidth}%` }" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PathJourneyTree from '@/components/PathJourneyTree.vue';
import PathDetailPanel from '@/components/PathDetailPanel.vue';
import { usePathStore } from '@/stores/pathStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { flattenJourney, type JourneyRow } from '@/domain/path/journey-view-model';
const pathStore=usePathStore(); const goalsStore=useGoalsStore(); const settingsStore=useSettingsStore();
const projection=computed(()=>pathStore.journeyProjection); const rows=computed(()=>projection.value?flattenJourney(projection.value):[]);
const entities=computed(()=>projection.value?.entities??[]); const goals=computed(()=>entities.value.filter(e=>e.type==='goal'||e.type==='milestone')); const actions=computed(()=>entities.value.filter(e=>e.type==='action')); const done=computed(()=>entities.value.filter(e=>e.status==='done')); const unscheduled=computed(()=>projection.value?.unscheduled??[]);
const select=(row:JourneyRow)=>{pathStore.select(row.id);goalsStore.setSelectedGoal(row.entity.type==='goal'||row.entity.type==='milestone'?row.id:null)};
const mainWidth=ref(55);const resizing=ref(false);const startX=ref(0);const startWidth=ref(0);const resizeBy=(delta:number)=>{mainWidth.value=Math.max(35,Math.min(70,mainWidth.value+delta));settingsStore.updateSettings({lastMainWidth:mainWidth.value})};
const startResize=(event:MouseEvent)=>{resizing.value=true;startX.value=event.clientX;startWidth.value=mainWidth.value;document.addEventListener('mousemove',move);document.addEventListener('mouseup',stop)};
const move=(event:MouseEvent)=>{if(!resizing.value)return;const width=document.querySelector('.journey-layout')?.clientWidth||0;if(width)mainWidth.value=Math.max(35,Math.min(70,startWidth.value+(event.clientX-startX.value)/width*100))};
const stop=()=>{if(resizing.value)settingsStore.updateSettings({lastMainWidth:mainWidth.value});resizing.value=false;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',stop)};
onMounted(()=>{mainWidth.value=settingsStore.settings.lastMainWidth||55});onUnmounted(stop);
</script>
<style scoped>
.dreamglows-journey-view{padding:1.25rem;color:var(--text-normal)}.journey-header h2,.journey-header p{margin:.2rem 0}.journey-header p{color:var(--text-muted)}.journey-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;margin:1rem 0}.journey-metrics article{display:grid;gap:.2rem;padding:.75rem;border:1px solid var(--background-modifier-border);border-radius:10px;background:var(--background-primary-alt)}.journey-metrics strong{font-size:1.35rem}.journey-metrics span{color:var(--text-muted);font-size:.78rem}.journey-layout{display:flex;min-height:440px}.journey-tree-panel,.journey-detail-panel{min-width:0;overflow:hidden;border:1px solid var(--background-modifier-border);border-radius:14px;background:var(--background-primary-alt)}.journey-resizer{flex:0 0 .7rem;margin:.5rem .15rem;border-radius:999px;cursor:ew-resize}.journey-resizer:hover,.journey-resizer:focus-visible{background:color-mix(in srgb,var(--interactive-accent) 35%,transparent)}
@media(max-width:980px){.journey-metrics{grid-template-columns:repeat(2,1fr)}.journey-layout{flex-direction:column;gap:.75rem}.journey-tree-panel,.journey-detail-panel{width:100%!important;min-height:340px}.journey-resizer{display:none}}@media(max-width:560px){.journey-metrics{grid-template-columns:1fr 1fr}}
</style>
