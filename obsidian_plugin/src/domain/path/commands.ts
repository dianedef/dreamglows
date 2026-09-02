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
    | 'has-children'
    | 'active-session-exists'
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

export interface CreateEntityInput { id: string; type: 'goal' | 'action'; title: string; description?: string; priority?: 'low' | 'medium' | 'high'; tags?: string[]; parentId?: string; planned?: PlannedPeriod; extensions?: JsonObject }
export interface UpdateEntityInput { title?: string; description?: string; priority?: 'low' | 'medium' | 'high'; tags?: string[] }
export interface StartFocusInput { id: string; actionId: string; mode: 'focus' | 'creation' | 'administration' }
export interface EndFocusInput { outcome: 'completed' | 'interrupted'; handoffNote?: string; nextAction?: string }

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

function intent(dependencies: PathCommandDependencies, command: string, value: JsonObject): JsonObject {
    return eventExtensions(dependencies, { command, intent: JSON.parse(JSON.stringify(value)) as JsonObject });
}
function validParent(envelope: PathEnvelope, type: 'goal' | 'action', parentId?: string): PathCommandRejection | undefined {
    if (!parentId) return;
    const parent = envelope.entities.find(item => item.id === parentId && !item.deletedAt);
    if (!parent) return 'parent-not-found';
    if (!(type === 'goal' ? parent.type === 'dream' || parent.type === 'goal' : parent.type === 'goal' || parent.type === 'milestone')) return 'incompatible-type';
}

export function createEntity(envelope: PathEnvelope, input: CreateEntityInput, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies); if (duplicate) return duplicate;
    if (!input.id.trim() || !input.title.trim()) return reject(envelope, 'invalid-command');
    if (envelope.entities.some(item => item.id === input.id) || envelope.events.some(item => item.id === input.id)) return reject(envelope, 'id-collision');
    const parentError = validParent(envelope, input.type, input.parentId); if (parentError) return reject(envelope, parentError);
    if (input.planned) { const error = periodError(input.planned); if (error) return reject(envelope, error); }
    const now = instant(dependencies); if (!now) return reject(envelope, 'invalid-date');
    const entity: PathEntity = { id: input.id, type: input.type, title: input.title, description: input.description ?? '', status: 'todo', ...(input.priority ? { priority: input.priority } : {}), ...(input.parentId ? { parentId: input.parentId } : {}), ...(input.planned ? { planned: { ...input.planned } } : {}), createdAt: now, updatedAt: now, tags: [...(input.tags ?? [])], extensions: { ...(input.extensions ?? {}) } };
    const event: PathEvent = { id: dependencies.createId(), type: 'entity-created', entityId: entity.id, occurredAt: now, recordedAt: now, extensions: intent(dependencies, 'create-entity', input as unknown as JsonObject) };
    return accepted(envelope, entity, event);
}

export function updateEntity(envelope: PathEnvelope, entityId: string, patch: UpdateEntityInput, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies); if (duplicate) return duplicate;
    const entity = envelope.entities.find(item => item.id === entityId && !item.deletedAt); if (!entity) return reject(envelope, 'entity-not-found');
    if (entity.type !== 'goal' && entity.type !== 'action') return reject(envelope, 'incompatible-type');
    if (patch.title !== undefined && !patch.title.trim()) return reject(envelope, 'invalid-command');
    const next: PathEntity = { ...entity, ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.description !== undefined ? { description: patch.description } : {}), ...(patch.priority !== undefined ? { priority: patch.priority } : {}), ...(patch.tags !== undefined ? { tags: [...patch.tags] } : {}) };
    const keys = ['title','description','priority','tags'] as const; const before: JsonObject = {}, after: JsonObject = {};
    for (const key of keys) if (patch[key] !== undefined && JSON.stringify(entity[key]) !== JSON.stringify(next[key])) { before[key] = (entity[key] ?? null) as any; after[key] = (next[key] ?? null) as any; }
    if (!Object.keys(after).length) return reject(envelope, 'no-op');
    const now = instant(dependencies); if (!now) return reject(envelope, 'invalid-date'); next.updatedAt = now;
    const event: PathEvent = { id: dependencies.createId(), type: 'entity-updated', entityId, occurredAt: now, recordedAt: now, previousValues: before, nextValues: after, extensions: intent(dependencies, 'update-entity', patch as unknown as JsonObject) };
    return accepted(envelope, next, event);
}

export function deleteEntity(envelope: PathEnvelope, entityId: string, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies); if (duplicate) return duplicate;
    const entity = envelope.entities.find(item => item.id === entityId); if (!entity) return reject(envelope, 'entity-not-found'); if (entity.deletedAt) return reject(envelope, 'no-op');
    if (envelope.entities.some(item => item.parentId === entityId && !item.deletedAt)) return reject(envelope, 'has-children');
    const now = instant(dependencies); if (!now) return reject(envelope, 'invalid-date');
    const updated = { ...entity, status: 'cancelled' as const, deletedAt: now, updatedAt: now };
    const event: PathEvent = { id: dependencies.createId(), type: 'entity-deleted', entityId, occurredAt: now, recordedAt: now, extensions: intent(dependencies, 'delete-entity', {}) };
    return accepted(envelope, updated, event);
}

export function startFocusSession(envelope: PathEnvelope, input: StartFocusInput, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies); if (duplicate) return duplicate;
    const action = envelope.entities.find(item => item.id === input.actionId && !item.deletedAt); if (!action) return reject(envelope, 'entity-not-found'); if (action.type !== 'action') return reject(envelope, 'incompatible-type');
    if (envelope.entities.some(item => item.type === 'focus-session' && item.status === 'in-progress' && !item.deletedAt)) return reject(envelope, 'active-session-exists');
    if (!input.id.trim() || envelope.entities.some(item => item.id === input.id) || envelope.events.some(item => item.id === input.id)) return reject(envelope, 'id-collision');
    const now = instant(dependencies); if (!now) return reject(envelope, 'invalid-date');
    const session: PathEntity = { id: input.id, type: 'focus-session', title: 'Session de focus', description: '', status: 'in-progress', parentId: input.actionId, occurredAt: now, createdAt: now, updatedAt: now, tags: [], extensions: { mode: input.mode } };
    const event: PathEvent = { id: dependencies.createId(), type: 'focus-session-started', entityId: input.id, occurredAt: now, recordedAt: now, extensions: intent(dependencies, 'start-focus-session', input as unknown as JsonObject) };
    return accepted(envelope, session, event);
}

export function endFocusSession(envelope: PathEnvelope, entityId: string, input: EndFocusInput, dependencies: PathCommandDependencies): PathCommandResult {
    const duplicate = preflight(envelope, dependencies); if (duplicate) return duplicate;
    const session = envelope.entities.find(item => item.id === entityId && !item.deletedAt); if (!session) return reject(envelope, 'entity-not-found'); if (session.type !== 'focus-session') return reject(envelope, 'incompatible-type'); if (session.status !== 'in-progress') return reject(envelope, 'no-op');
    const now = instant(dependencies); if (!now) return reject(envelope, 'invalid-date');
    const updated: PathEntity = { ...session, status: input.outcome === 'completed' ? 'done' : 'cancelled', completedAt: now, updatedAt: now, extensions: { ...session.extensions, ...(input.handoffNote?.trim() ? { handoffNote: input.handoffNote.trim() } : {}), ...(input.nextAction?.trim() ? { nextAction: input.nextAction.trim() } : {}) } };
    const event: PathEvent = { id: dependencies.createId(), type: 'focus-session-ended', entityId, occurredAt: now, recordedAt: now, extensions: intent(dependencies, 'end-focus-session', input as unknown as JsonObject) };
    return accepted(envelope, updated, event);
}
