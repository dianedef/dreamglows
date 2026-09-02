import type { JourneyNode, JourneyProjection } from './projections.ts';
import type { PathEntity, PathEntityType, PathEnvelope, PathEvent } from './model.ts';

export interface JourneyRow {
    key: string;
    id: string;
    entity: PathEntity;
    depth: number;
    parentKey?: string;
    contextOnly: boolean;
    cycleReference: boolean;
    orphan: boolean;
    outsideRange?: boolean;
}

export interface JourneyCapabilities {
    schedule: boolean;
    reschedule: boolean;
    resize: boolean;
    complete: boolean;
    reopen: boolean;
    reparent: boolean;
    addEvidence: boolean;
    addReflection: boolean;
}

export interface JourneyDetail {
    entity: PathEntity;
    parent?: PathEntity;
    children: readonly PathEntity[];
    events: readonly PathEvent[];
    capabilities: JourneyCapabilities;
}

interface PendingNode {
    node: JourneyNode;
    depth: number;
    parentKey?: string;
    parentId?: string;
    path: string;
    ancestors: ReadonlySet<string>;
}

const schedulable = new Set<PathEntityType>(['dream', 'goal', 'milestone', 'action', 'habit', 'focus-session']);
const completable = new Set<PathEntityType>(['dream', 'goal', 'milestone', 'action', 'habit', 'focus-session']);
const reparentable = new Set<PathEntityType>(['goal', 'milestone', 'action', 'habit']);

function segment(id: string, index: number): string {
    return `${encodeURIComponent(id)}@${index}`;
}

/**
 * Flattens the canonical Journey tree without trusting entity identifiers to be
 * globally unique in malformed legacy input. Path-derived keys remain unique,
 * and repeated ancestors become terminal cycle references.
 */
export function flattenJourney(projection: JourneyProjection): readonly JourneyRow[] {
    const rows: JourneyRow[] = [];
    const pending: PendingNode[] = [];

    for (let index = projection.roots.length - 1; index >= 0; index -= 1) {
        pending.push({ node: projection.roots[index], depth: 0, path: segment(projection.roots[index].id, index), ancestors: new Set() });
    }

    while (pending.length) {
        const current = pending.pop()!;
        const cycleReference = current.ancestors.has(current.node.id);
        const outsideRange = projection.selected?.id === current.node.id && projection.selectionVisibility === 'outside-range'
            ? true
            : undefined;
        rows.push({
            key: current.path,
            id: current.node.id,
            entity: current.node.entity,
            depth: current.depth,
            ...(current.parentKey ? { parentKey: current.parentKey } : {}),
            contextOnly: current.node.contextOnly === true,
            cycleReference,
            orphan: current.node.entity.parentId !== undefined && current.node.entity.parentId !== current.parentId,
            ...(outsideRange === undefined ? {} : { outsideRange }),
        });

        if (cycleReference) continue;
        const ancestors = new Set(current.ancestors);
        ancestors.add(current.node.id);
        for (let index = current.node.children.length - 1; index >= 0; index -= 1) {
            const child = current.node.children[index];
            pending.push({
                node: child,
                depth: current.depth + 1,
                parentKey: current.path,
                parentId: current.node.id,
                path: `${current.path}/${segment(child.id, index)}`,
                ancestors,
            });
        }
    }

    return rows;
}

export function journeyDetail(envelope: PathEnvelope, entityId: string): JourneyDetail | undefined {
    const entity = envelope.entities.find(item => item.id === entityId);
    if (!entity) return undefined;
    const hasPlanned = entity.planned?.start !== undefined || entity.planned?.end !== undefined;
    const canRecord = entity.type !== 'evidence' && entity.type !== 'reflection';
    return {
        entity,
        ...(entity.parentId ? { parent: envelope.entities.find(item => item.id === entity.parentId) } : {}),
        children: envelope.entities.filter(item => item.parentId === entity.id),
        events: envelope.events.filter(event => event.entityId === entity.id || event.relatedEntityId === entity.id),
        capabilities: {
            schedule: schedulable.has(entity.type) && !hasPlanned,
            reschedule: schedulable.has(entity.type) && hasPlanned,
            resize: schedulable.has(entity.type) && hasPlanned,
            complete: completable.has(entity.type) && entity.status !== 'done',
            reopen: completable.has(entity.type) && entity.status === 'done',
            reparent: reparentable.has(entity.type),
            addEvidence: canRecord,
            addReflection: canRecord,
        },
    };
}
