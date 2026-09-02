import { isCivilDate, isZonedInstant } from './primitives.ts';
import type {
    JsonObject,
    PathEntity,
    PathEntityType,
    PathEnvelope,
    PathEvent,
    PlannedPeriod,
    ZonedInstant,
} from './model.ts';

export interface PathCommandDependencies {
    commandId: string;
    now(): ZonedInstant;
    createId(): string;
}

export type PathCommandRejection =
    | 'entity-not-found'
    | 'parent-not-found'
    | 'incompatible-type'
    | 'invalid-date'
    | 'inverted-period'
    | 'cycle'
    | 'invalid-command'
    | 'id-collision'
    | 'no-op';

export type PathCommandResult =
    | { accepted: true; envelope: PathEnvelope; entity: PathEntity; event: PathEvent }
    | { accepted: false; envelope: PathEnvelope; reason: PathCommandRejection };

export interface RecordedEntityInput {
    title: string;
    description?: string;
    occurredAt?: ZonedInstant;
    tags?: string[];
    extensions?: JsonObject;
}

const schedulable = new Set<PathEntityType>(['dream', 'goal', 'milestone', 'action', 'habit', 'focus-session']);
const completable = new Set<PathEntityType>(['dream', 'goal', 'milestone', 'action', 'habit', 'focus-session']);
const childTypes = new Set<PathEntityType>(['goal', 'milestone', 'action', 'habit']);

const allowedParents: Partial<Record<PathEntityType, ReadonlySet<PathEntityType>>> = {
    goal: new Set(['dream', 'goal']),
    milestone: new Set(['goal']),
    action: new Set(['goal', 'milestone']),
    habit: new Set(['goal']),
};

function reject(envelope: PathEnvelope, reason: PathCommandRejection): PathCommandResult {
    return { accepted: false, envelope, reason };
}

function accepted(envelope: PathEnvelope, entity: PathEntity, event: PathEvent): PathCommandResult {
    const isNewEntity = !envelope.entities.some(item => item.id === entity.id);
    const occupied = envelope.entities.some(item => item.id === event.id)
        || envelope.events.some(item => item.id === event.id)
        || (isNewEntity && (envelope.entities.some(item => item.id === entity.id) || envelope.events.some(item => item.id === entity.id)))
        || event.id === entity.id;
    if (occupied) return reject(envelope, 'id-collision');
    return {
        accepted: true,
        envelope: {
            ...envelope,
            entities: envelope.entities.map(item => item.id === entity.id ? entity : item).concat(
                envelope.entities.some(item => item.id === entity.id) ? [] : [entity],
            ),
            events: [...envelope.events, event],
        },
        entity,
        event,
    };
}

function preflight(envelope: PathEnvelope, dependencies: PathCommandDependencies): PathCommandResult | undefined {
    if (!dependencies.commandId.trim()) return reject(envelope, 'invalid-command');
    if (envelope.events.some(event => event.extensions.commandId === dependencies.commandId)) return reject(envelope, 'no-op');
    return undefined;
}

function eventExtensions(dependencies: PathCommandDependencies, values: JsonObject = {}): JsonObject {
    return { ...values, commandId: dependencies.commandId };
}

function instant(dependencies: PathCommandDependencies): ZonedInstant | undefined {
    const value = dependencies.now();
    return isZonedInstant(value) ? value : undefined;
}

function periodError(period: PlannedPeriod): 'invalid-date' | 'inverted-period' | undefined {
    const values = [period.start, period.end].filter((value): value is NonNullable<typeof value> => value !== undefined);
    if (values.some(value => !isCivilDate(value) && !isZonedInstant(value))) return 'invalid-date';
    if (period.start !== undefined && period.end !== undefined) {
        const sameKind = isCivilDate(period.start) === isCivilDate(period.end);
        if (!sameKind) return 'invalid-date';
        const start = isCivilDate(period.start) ? period.start : Date.parse(period.start);
        const end = isCivilDate(period.end) ? period.end : Date.parse(period.end);
        if (start > end) return 'inverted-period';
    }
    return undefined;
}

function samePeriod(left: PlannedPeriod | undefined, right: PlannedPeriod | undefined): boolean {
    return left?.start === right?.start && left?.end === right?.end;
}

function movePreservingDuration(current: PlannedPeriod, requested: PlannedPeriod): PlannedPeriod {
    if (requested.start === undefined || requested.end !== undefined || current.start === undefined || current.end === undefined) {
        return requested;
    }
    if (isCivilDate(current.start) && isCivilDate(current.end) && isCivilDate(requested.start)) {
        const duration = Date.parse(`${current.end}T00:00:00.000Z`) - Date.parse(`${current.start}T00:00:00.000Z`);
        const end = new Date(Date.parse(`${requested.start}T00:00:00.000Z`) + duration).toISOString().slice(0, 10);
        return { start: requested.start, end: end as PlannedPeriod['end'] };
    }
    if (isZonedInstant(current.start) && isZonedInstant(current.end) && isZonedInstant(requested.start)) {
        const duration = Date.parse(current.end) - Date.parse(current.start);
        return { start: requested.start, end: new Date(Date.parse(requested.start) + duration).toISOString() as ZonedInstant };
    }
    return requested;
}

function changePlanned(
    envelope: PathEnvelope,
    entityId: string,
    nextPlanned: PlannedPeriod,
    dependencies: PathCommandDependencies,
    mode: 'schedule' | 'reschedule',
): PathCommandResult {
    const duplicate = preflight(envelope, dependencies);
    if (duplicate) return duplicate;
    const entity = envelope.entities.find(item => item.id === entityId);
    if (!entity) return reject(envelope, 'entity-not-found');
    if (!schedulable.has(entity.type)) return reject(envelope, 'incompatible-type');
    if (nextPlanned.start === undefined) return reject(envelope, 'invalid-command');
    const resolvedPlanned = mode === 'reschedule' && entity.planned
        ? movePreservingDuration(entity.planned, nextPlanned)
        : nextPlanned;
    const error = periodError(resolvedPlanned);
    if (error) return reject(envelope, error);
    if (mode === 'schedule' && entity.planned !== undefined) return reject(envelope, 'no-op');
    if (mode === 'reschedule' && entity.planned === undefined) return reject(envelope, 'no-op');
    if (samePeriod(entity.planned, resolvedPlanned)) return reject(envelope, 'no-op');
    const now = instant(dependencies);
    if (!now) return reject(envelope, 'invalid-date');
    const updated = { ...entity, planned: { ...resolvedPlanned }, updatedAt: now };
    const event: PathEvent = {
        id: dependencies.createId(), type: 'planned-period-changed', entityId, occurredAt: now, recordedAt: now,
        ...(entity.planned ? { previousPlanned: { ...entity.planned } } : {}),
        nextPlanned: { ...resolvedPlanned }, extensions: eventExtensions(dependencies, { command: mode }),
    };
    return accepted(envelope, updated, event);
}

export function schedule(envelope: PathEnvelope, entityId: string, planned: PlannedPeriod, dependencies: PathCommandDependencies): PathCommandResult {
    return changePlanned(envelope, entityId, planned, dependencies, 'schedule');
}

export function reschedule(envelope: PathEnvelope, entityId: string, planned: PlannedPeriod, dependencies: PathCommandDependencies): PathCommandResult {
    return changePlanned(envelope, entityId, planned, dependencies, 'reschedule');
}

export function resize(envelope: PathEnvelope, entityId: string, patch: PlannedPeriod, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies);
    if (duplicate) return duplicate;
    const entity = envelope.entities.find(item => item.id === entityId);
    if (!entity) return reject(envelope, 'entity-not-found');
    if (!schedulable.has(entity.type)) return reject(envelope, 'incompatible-type');
    if (!entity.planned) return reject(envelope, 'no-op');
    if ((patch.start === undefined) === (patch.end === undefined)) return reject(envelope, patch.start === undefined ? 'no-op' : 'invalid-command');
    const next = { ...entity.planned, ...patch };
    const error = periodError(next);
    if (error) return reject(envelope, error);
    if (samePeriod(entity.planned, next)) return reject(envelope, 'no-op');
    const now = instant(dependencies);
    if (!now) return reject(envelope, 'invalid-date');
    const updated = { ...entity, planned: next, updatedAt: now };
    const event: PathEvent = {
        id: dependencies.createId(), type: 'planned-period-changed', entityId, occurredAt: now, recordedAt: now,
        previousPlanned: { ...entity.planned }, nextPlanned: { ...next }, extensions: eventExtensions(dependencies, { command: 'resize' }),
    };
    return accepted(envelope, updated, event);
}

export function complete(envelope: PathEnvelope, entityId: string, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies);
    if (duplicate) return duplicate;
    const entity = envelope.entities.find(item => item.id === entityId);
    if (!entity) return reject(envelope, 'entity-not-found');
    if (!completable.has(entity.type)) return reject(envelope, 'incompatible-type');
    if (entity.status === 'done') return reject(envelope, 'no-op');
    if (entity.status !== 'todo' && entity.status !== 'in-progress') return reject(envelope, 'incompatible-type');
    const now = instant(dependencies);
    if (!now) return reject(envelope, 'invalid-date');
    const updated = { ...entity, status: 'done' as const, completedAt: now, updatedAt: now };
    const event: PathEvent = { id: dependencies.createId(), type: 'entity-completed', entityId, occurredAt: now, recordedAt: now, extensions: eventExtensions(dependencies) };
    return accepted(envelope, updated, event);
}

export function reopen(envelope: PathEnvelope, entityId: string, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies);
    if (duplicate) return duplicate;
    const entity = envelope.entities.find(item => item.id === entityId);
    if (!entity) return reject(envelope, 'entity-not-found');
    if (!completable.has(entity.type)) return reject(envelope, 'incompatible-type');
    if (entity.status !== 'done') return reject(envelope, 'no-op');
    const now = instant(dependencies);
    if (!now) return reject(envelope, 'invalid-date');
    const { completedAt: _completedAt, ...rest } = entity;
    const updated: PathEntity = { ...rest, status: 'in-progress', updatedAt: now };
    const event: PathEvent = { id: dependencies.createId(), type: 'entity-reopened', entityId, occurredAt: now, recordedAt: now, extensions: eventExtensions(dependencies) };
    return accepted(envelope, updated, event);
}

export function reparent(envelope: PathEnvelope, entityId: string, nextParentId: string | undefined, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies);
    if (duplicate) return duplicate;
    const entity = envelope.entities.find(item => item.id === entityId);
    if (!entity) return reject(envelope, 'entity-not-found');
    if (!childTypes.has(entity.type)) return reject(envelope, 'incompatible-type');
    if (entity.parentId === nextParentId) return reject(envelope, 'no-op');
    if (nextParentId !== undefined) {
        const parent = envelope.entities.find(item => item.id === nextParentId);
        if (!parent) return reject(envelope, 'parent-not-found');
        if (!allowedParents[entity.type]?.has(parent.type)) return reject(envelope, 'incompatible-type');
        let cursor: PathEntity | undefined = parent;
        const visited = new Set<string>();
        while (cursor) {
            if (cursor.id === entityId) return reject(envelope, 'cycle');
            if (!cursor.parentId || visited.has(cursor.id)) break;
            visited.add(cursor.id);
            cursor = envelope.entities.find(item => item.id === cursor?.parentId);
        }
    }
    const now = instant(dependencies);
    if (!now) return reject(envelope, 'invalid-date');
    const updated: PathEntity = { ...entity, updatedAt: now };
    if (nextParentId === undefined) delete updated.parentId;
    else updated.parentId = nextParentId;
    const event: PathEvent = {
        id: dependencies.createId(), type: 'entity-reparented', entityId, occurredAt: now, recordedAt: now,
        ...(entity.parentId ? { previousParentId: entity.parentId } : {}),
        ...(nextParentId ? { nextParentId } : {}), extensions: eventExtensions(dependencies),
    };
    return accepted(envelope, updated, event);
}

function record(
    envelope: PathEnvelope,
    targetId: string,
    input: RecordedEntityInput,
    dependencies: PathCommandDependencies,
    kind: 'evidence' | 'reflection',
): PathCommandResult {
    const duplicate = preflight(envelope, dependencies);
    if (duplicate) return duplicate;
    const target = envelope.entities.find(item => item.id === targetId);
    if (!target) return reject(envelope, 'entity-not-found');
    if (target.type === 'evidence' || target.type === 'reflection') return reject(envelope, 'incompatible-type');
    if (!input.title.trim()) return reject(envelope, 'no-op');
    const now = instant(dependencies);
    if (!now || (input.occurredAt !== undefined && !isZonedInstant(input.occurredAt))) return reject(envelope, 'invalid-date');
    const id = dependencies.createId();
    if (envelope.entities.some(item => item.id === id) || envelope.events.some(item => item.id === id)) return reject(envelope, 'id-collision');
    const entity: PathEntity = {
        id, type: kind, title: input.title, description: input.description ?? '', status: 'done', parentId: targetId,
        occurredAt: input.occurredAt ?? now, completedAt: input.occurredAt ?? now, createdAt: now, updatedAt: now, tags: [...(input.tags ?? [])],
        extensions: { ...(input.extensions ?? {}) },
    };
    const event: PathEvent = {
        id: dependencies.createId(), type: kind === 'evidence' ? 'evidence-recorded' : 'reflection-recorded',
        entityId: targetId, relatedEntityId: id, occurredAt: entity.occurredAt!, recordedAt: now, extensions: eventExtensions(dependencies),
    };
    return accepted(envelope, entity, event);
}

export function addEvidence(envelope: PathEnvelope, targetId: string, input: RecordedEntityInput, dependencies: PathCommandDependencies): PathCommandResult {
    return record(envelope, targetId, input, dependencies, 'evidence');
}

export function addReflection(envelope: PathEnvelope, targetId: string, input: RecordedEntityInput, dependencies: PathCommandDependencies): PathCommandResult {
    return record(envelope, targetId, input, dependencies, 'reflection');
}
