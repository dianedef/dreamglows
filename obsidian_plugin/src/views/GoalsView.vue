<template>
  <div class="dreamglows-goals-view" data-dg-goals-canonical>
    <header><div><h2>Objectifs</h2><p>Du rêve à l’action, dans une seule arborescence.</p></div><button type="button" @click="openNewGoalModal">+ Nouvel objectif</button></header>
    <section class="metrics" aria-label="Vue d’ensemble"><article v-for="metric in goalMetrics" :key="metric.label"><strong>{{ metric.value }}</strong><span>{{ metric.label }}</span></article></section>
    <p v-if="projection?.selectionVisibility === 'filtered'" role="status">La sélection reste ouverte mais est masquée par les filtres.</p>
    <div class="layout">
      <div id="goals-tree" class="panel" :style="{width:`${mainWidth}%`}"><PathJourneyTree :items="rows" :selected-id="pathStore.selectedId" @select="selectRow" /></div>
      <div class="resizer" role="separator" aria-label="Redimensionner les panneaux" aria-orientation="vertical" aria-controls="goals-tree goals-detail" aria-valuemin="35" aria-valuemax="70" :aria-valuenow="Math.round(mainWidth)" tabindex="0" @mousedown="startResize" @keydown.left.prevent="resizeBy(-5)" @keydown.right.prevent="resizeBy(5)" />
      <div id="goals-detail" class="panel detail" :style="{width:`${100-mainWidth}%`}"><PathDetailPanel /><div v-if="selectedEntity && (editable || canAddAction)" class="actions"><button v-if="editable" type="button" class="mod-cta" @click="editSelected">Modifier</button><button v-if="canAddAction" type="button" @click="createTaskForGoal">+ Ajouter une action</button></div></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed,onMounted,onUnmounted,ref } from 'vue';
import PathJourneyTree from '@/components/PathJourneyTree.vue';
import PathDetailPanel from '@/components/PathDetailPanel.vue';
import { flattenJourney,type JourneyRow } from '@/domain/path/journey-view-model';
import type { PathEntity } from '@/domain/path/model';
import { usePathStore } from '@/stores/pathStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDreamGlowsUiContext } from '@/application/ui-context';
import { GoalModal } from '@/components/modals/GoalModal';
import { TaskModal } from '@/components/modals/TaskModal';
import type { Goal } from '@/types/goals'; import type { Task } from '@/types/tasks';
const props=defineProps<{contentFiles:any[];app:any}>(); const pathStore=usePathStore(); const settingsStore=useSettingsStore(); const uiContext=useDreamGlowsUiContext();
const projection=computed(()=>pathStore.journeyProjection); const rows=computed(()=>projection.value?flattenJourney(projection.value):[]); const entities=computed(()=>projection.value?.entities??[]);
const goals=computed(()=>entities.value.filter(e=>e.type==='goal'||e.type==='milestone')); const actions=computed(()=>entities.value.filter(e=>e.type==='action'));
const selectedEntity=computed(()=>pathStore.document?.envelope.entities.find(e=>e.id===pathStore.selectedId&&!e.deletedAt)); const editable=computed(()=>selectedEntity.value?.type==='goal'||selectedEntity.value?.type==='action'); const canAddAction=computed(()=>selectedEntity.value?.type==='goal'||selectedEntity.value?.type==='milestone');
const goalMetrics=computed(()=>[{label:'Objectifs actifs',value:goals.value.filter(e=>e.status!=='done'&&e.status!=='cancelled').length},{label:'Objectifs terminés',value:goals.value.filter(e=>e.status==='done').length},{label:'Actions en cours',value:actions.value.filter(e=>e.status==='in-progress').length},{label:'À planifier',value:projection.value?.unscheduled.length??0}]);
const selectRow=(row:JourneyRow)=>pathStore.select(row.id);
const asGoal=(e:PathEntity)=>({id:e.id,title:e.title,description:e.description,status:e.status==='in-progress'?'in_progress':e.status,priority:e.priority,tags:[...e.tags],parentGoalId:e.parentId,startDate:e.planned?.start,dueDate:e.planned?.end,createdAt:e.createdAt,updatedAt:e.updatedAt} as Goal);
const asTask=(e:PathEntity)=>({id:e.id,title:e.title,description:e.description,status:e.status,priority:e.priority,tags:[...e.tags],goalId:e.parentId,startDate:e.planned?.start,dueDate:e.planned?.end,createdAt:e.createdAt,updatedAt:e.updatedAt} as Task);
const editSelected=()=>{const e=selectedEntity.value;if(e?.type==='goal')new GoalModal(props.app,uiContext,asGoal(e)).open();if(e?.type==='action')new TaskModal(props.app,uiContext,asTask(e)).open()}; const openNewGoalModal=()=>new GoalModal(props.app,uiContext).open(); const createTaskForGoal=()=>{if(canAddAction.value&&selectedEntity.value)new TaskModal(props.app,uiContext,undefined,selectedEntity.value.id).open()};
const mainWidth=ref(55),resizing=ref(false),startX=ref(0),startWidth=ref(0); const resizeBy=(d:number)=>{mainWidth.value=Math.max(35,Math.min(70,mainWidth.value+d));settingsStore.updateSettings({lastMainWidth:mainWidth.value})}; const startResize=(e:MouseEvent)=>{resizing.value=true;startX.value=e.clientX;startWidth.value=mainWidth.value;document.addEventListener('mousemove',move);document.addEventListener('mouseup',stop)}; const move=(e:MouseEvent)=>{if(!resizing.value)return;const w=document.querySelector('.layout')?.clientWidth||0;if(w)mainWidth.value=Math.max(35,Math.min(70,startWidth.value+(e.clientX-startX.value)/w*100))}; const stop=()=>{if(resizing.value)settingsStore.updateSettings({lastMainWidth:mainWidth.value});resizing.value=false;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',stop)}; onMounted(()=>{mainWidth.value=settingsStore.settings.lastMainWidth||55});onUnmounted(stop);
</script>
<style scoped>
.dreamglows-goals-view{height:calc(100vh - 80px);display:flex;flex-direction:column;padding:20px;box-sizing:border-box}.dreamglows-goals-view>header{display:flex;align-items:center;justify-content:space-between;gap:1rem}.dreamglows-goals-view h2,.dreamglows-goals-view header p{margin:.2rem 0}.dreamglows-goals-view header p{color:var(--text-muted)}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;margin:1rem 0}.metrics article{display:grid;gap:.2rem;padding:.75rem;border:1px solid var(--background-modifier-border);border-radius:10px;background:var(--background-primary-alt)}.metrics strong{font-size:1.35rem}.metrics span{color:var(--text-muted);font-size:.78rem}.layout{display:flex;flex:1;min-height:420px;overflow:hidden}.panel{min-width:0;overflow:hidden;border:1px solid var(--background-modifier-border);border-radius:14px;background:var(--background-primary-alt)}.detail{display:flex;flex-direction:column;overflow-y:auto}.detail :deep(.path-detail){flex:1}.actions{display:flex;gap:.55rem;padding:0 1.3rem 1.3rem}.resizer{flex:0 0 .7rem;margin:.5rem .15rem;border-radius:999px;cursor:ew-resize}.resizer:hover,.resizer:focus-visible{background:color-mix(in srgb,var(--interactive-accent) 35%,transparent)}@media(max-width:980px){.metrics{grid-template-columns:repeat(2,1fr)}.layout{flex-direction:column;gap:.75rem;overflow:visible}.panel{width:100%!important;min-height:340px}.resizer{display:none}.dreamglows-goals-view{height:auto}}@media(max-width:560px){.metrics{grid-template-columns:1fr 1fr}}
</style>
