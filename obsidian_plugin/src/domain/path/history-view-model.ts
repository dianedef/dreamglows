import type { HistoryProjection } from './projections.ts';
import type { PathEntity, PathEnvelope, PathEvent, PathEventType, PlannedPeriod } from './model.ts';

export interface HistoryChange {
    field: 'entity' | 'planned' | 'status' | 'parent' | 'evidence' | 'reflection';
    label: string;
    before?: string;
    after?: string;
}

export interface HistoryRow {
    id: string;
    event: PathEvent;
    target: PathEntity;
    relatedEntity?: PathEntity;
    label: string;
    changes: readonly HistoryChange[];
    selected: boolean;
}

const labels: Record<PathEventType, string> = {
    'entity-created': 'Création',
    'entity-updated': 'Élément modifié',
    'entity-deleted': 'Élément archivé',
    'planned-period-changed': 'Planification ajustée',
    'entity-completed': 'Étape accomplie',
    'entity-reopened': 'Étape rouverte',
    'entity-reparented': 'Chemin réorganisé',
    'evidence-recorded': 'Preuve ajoutée',
    'reflection-recorded': 'Réflexion ajoutée',
    'focus-session-started': 'Session Focus démarrée',
    'focus-session-ended': 'Session Focus terminée',
};

function periodLabel(period: PlannedPeriod | undefined): string {
    if (!period?.start && !period?.end) return 'Non planifié';
    if (period.start && period.end) return period.start === period.end
        ? period.start
        : `${period.start} → ${period.end}`;
    return period.start ? `À partir du ${period.start}` : `Jusqu’au ${period.end}`;
}

function entityLabel(entities: ReadonlyMap<string, PathEntity>, id: string | undefined): string {
    if (!id) return 'Racine du chemin';
    return entities.get(id)?.title ?? `Entité indisponible (${id})`;
}

function changesFor(event: PathEvent, target: PathEntity, related: PathEntity | undefined, entities: ReadonlyMap<string, PathEntity>): HistoryChange[] {
    if (event.type === 'entity-created') {
        return [{ field: 'entity', label: 'Élément', after: target.title }];
    }
    if (event.type === 'entity-updated') {
        return [{ field: 'entity', label: 'Élément', after: target.title }];
    }
    if (event.type === 'entity-deleted') {
        return [{ field: 'status', label: 'État', after: 'Archivé' }];
    }
    if (event.type === 'planned-period-changed') {
        return [{ field: 'planned', label: 'Période prévue', before: periodLabel(event.previousPlanned), after: periodLabel(event.nextPlanned) }];
    }
    if (event.type === 'entity-completed') {
        return [{ field: 'status', label: 'État', after: 'Terminé' }];
    }
    if (event.type === 'entity-reopened') {
        return [{ field: 'status', label: 'État', before: 'Terminé', after: 'Rouvert' }];
    }
    if (event.type === 'entity-reparented') {
        return [{
            field: 'parent',
            label: 'Parent',
            before: entityLabel(entities, event.previousParentId),
            after: entityLabel(entities, event.nextParentId),
        }];
    }
    if (event.type === 'focus-session-started') {
        return [{ field: 'status', label: 'Session', after: 'En cours' }];
    }
    if (event.type === 'focus-session-ended') {
        return [{ field: 'status', label: 'Session', before: 'En cours', after: target.status === 'completed' ? 'Terminée' : 'Interrompue' }];
    }
    const field = event.type === 'evidence-recorded' ? 'evidence' : 'reflection';
    return [{
        field,
        label: event.type === 'evidence-recorded' ? 'Preuve' : 'Réflexion',
        after: related?.title ?? (event.relatedEntityId ? `Entité indisponible (${event.relatedEntityId})` : 'Entité liée indisponible'),
    }];
}

/** Builds presentation-ready history rows while retaining canonical references. */
export function historyViewRows(projection: HistoryProjection, envelope: PathEnvelope): readonly HistoryRow[] {
    const entities = new Map(envelope.entities.map(entity => [entity.id, entity]));
    return projection.items.map(item => {
        const relatedEntity = item.event.relatedEntityId ? entities.get(item.event.relatedEntityId) : undefined;
        return {
            id: item.id,
            event: item.event,
            target: item.entity,
            ...(relatedEntity ? { relatedEntity } : {}),
            label: labels[item.event.type],
            changes: changesFor(item.event, item.entity, relatedEntity, entities),
            selected: projection.selected?.id === item.entity.id || projection.selected?.id === relatedEntity?.id,
        };
    });
}
