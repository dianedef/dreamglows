<template>
  <aside class="path-detail" data-dg-detail :data-dg-selected-id="detail?.entity.id" aria-labelledby="path-detail-title">
    <template v-if="detail">
      <p class="dreamglows-kicker">{{ typeLabel(detail.entity.type) }}</p><h3 id="path-detail-title">{{ detail.entity.title }}</h3>
      <div class="path-detail__badges"><span>{{ statusLabel(detail.entity.status) }}</span><span v-if="detail.entity.priority">Priorité {{ detail.entity.priority }}</span></div>
      <p>{{ detail.entity.description || 'Aucune description pour le moment.' }}</p>
      <dl><template v-if="detail.parent"><dt>Parent</dt><dd>{{ detail.parent.title }}</dd></template><template v-if="detail.entity.planned?.start"><dt>Début prévu</dt><dd>{{ detail.entity.planned.start }}</dd></template><template v-if="detail.entity.planned?.end"><dt>Fin prévue</dt><dd>{{ detail.entity.planned.end }}</dd></template><template v-if="detail.entity.completedAt"><dt>Réalisé</dt><dd>{{ detail.entity.completedAt }}</dd></template><dt>Événements</dt><dd>{{ detail.events.length }}</dd></dl>
      <form v-if="detail.capabilities.reparent" class="path-detail__parent" @submit.prevent="submitParent"><label for="path-parent">Parent</label><select id="path-parent" v-model="parentId"><option value="">Sans parent</option><option v-for="candidate in parentCandidates" :key="candidate.id" :value="candidate.id">{{ candidate.title }}</option></select><button type="submit" data-dg-command="reparent">Déplacer</button></form>
      <p v-if="feedback" :role="feedback.error ? 'alert' : 'status'">{{ feedback.text }}</p>
    </template>
    <div v-else class="path-detail__empty"><strong>Sélectionnez un élément</strong><p>Son contexte, ses dates et son histoire apparaîtront ici.</p></div>
  </aside>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePathStore } from '@/stores/pathStore';
import { journeyDetail } from '@/domain/path/journey-view-model';
import { usePathCommandPort } from '@/application/path-command-port';
import type { PathEntityType, PathStatus } from '@/domain/path/model';
const pathStore = usePathStore(); const commands = usePathCommandPort();
const detail = computed(() => pathStore.document && pathStore.selectedId ? journeyDetail(pathStore.document.envelope, pathStore.selectedId) : undefined);
const parentId = ref(''); const feedback = ref<{ error: boolean; text: string }>(); const retryId = ref<string>();
watch(detail, value => { parentId.value = value?.entity.parentId ?? ''; feedback.value = undefined; retryId.value = undefined; }, { immediate: true });
const descendants = computed(() => { const ids = new Set<string>(); if (!detail.value || !pathStore.document) return ids; let changed = true; while (changed) { changed = false; for (const entity of pathStore.document.envelope.entities) if (entity.parentId === detail.value.entity.id || (entity.parentId && ids.has(entity.parentId))) if (!ids.has(entity.id)) { ids.add(entity.id); changed = true; } } return ids; });
const parentCandidates = computed(() => { const entity = detail.value?.entity; if (!entity || !pathStore.document) return []; const allowed = entity.type === 'goal' ? ['dream','goal'] : entity.type === 'milestone' ? ['goal'] : entity.type === 'action' ? ['goal','milestone'] : ['goal']; return pathStore.document.envelope.entities.filter(candidate => allowed.includes(candidate.type) && candidate.id !== entity.id && !descendants.value.has(candidate.id)); });
const submitParent = async () => { if (!detail.value) return; const commandId = retryId.value ?? (globalThis.crypto?.randomUUID?.() ?? `reparent-${detail.value.entity.id}-${Date.now()}`); retryId.value = commandId; try { const result = await commands.execute({ type:'reparent', commandId, entityId:detail.value.entity.id, nextParentId: parentId.value || undefined }); if (!result.accepted) { retryId.value = undefined; feedback.value = { error:true,text:`Déplacement refusé : ${result.reason}.` }; } else { retryId.value = undefined; feedback.value = { error:false,text:'Parcours réorganisé.' }; } } catch { feedback.value = { error:true,text:'La sauvegarde a échoué; le parent précédent est conservé.' }; } };
const typeLabel = (type: PathEntityType) => ({dream:'Rêve',goal:'Objectif',milestone:'Jalon',action:'Action',habit:'Habitude','focus-session':'Session',evidence:'Preuve',reflection:'Réflexion'}[type]);
const statusLabel = (status: PathStatus) => ({todo:'À faire','in-progress':'En cours',done:'Terminé',cancelled:'Annulé'}[status]);
</script>
<style scoped>.path-detail{padding:1.3rem;overflow-y:auto;box-sizing:border-box}.path-detail h3{margin:.3rem 0 .75rem}.path-detail__badges{display:flex;gap:.4rem}.path-detail__badges span{padding:.22rem .55rem;border-radius:999px;background:var(--background-modifier-hover);color:var(--text-muted);font-size:.72rem}.path-detail dl{display:grid;grid-template-columns:auto 1fr;gap:.45rem 1rem}.path-detail dd{margin:0}.path-detail dt{color:var(--text-muted)}.path-detail__parent{display:flex;flex-wrap:wrap;align-items:end;gap:.5rem;margin-top:1rem}.path-detail__parent label{display:grid}.path-detail__empty{display:grid;place-items:center;align-content:center;height:100%;text-align:center;color:var(--text-muted)}</style>
