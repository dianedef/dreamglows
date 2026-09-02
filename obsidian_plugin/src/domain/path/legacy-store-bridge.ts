import type {
    JsonObject,
    JsonValue,
    PathEntity,
    PathStatus,
    ZonedInstant,
} from './model.ts';
import type { PathRepositoryDocument } from './repository.ts';

export interface LegacyStoreSnapshot {
    goals: JsonObject[];
    tasks: JsonObject[];
    focusSessions: JsonObject[];
    settings: JsonObject;
}

const EPOCH = '1970-01-01T00:00:00.000Z' as ZonedInstant;

const isObject = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const clone = <T extends JsonValue>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const text = (value: JsonValue | undefined, fallback = ''): string => typeof value === 'string' ? value : fallback;
const optionalText = (value: JsonValue | undefined): string | undefined => typeof value === 'string' && value.length ? value : undefined;
const stringList = (value: JsonValue | undefined): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function legacyFields(entity: PathEntity): JsonObject {
    const legacy = isObject(entity.extensions.legacy) ? entity.extensions.legacy : {};
    const migrated = isObject(legacy.fields) ? legacy.fields : {};
    const compatibility = isObject(entity.extensions.legacyStore) ? entity.extensions.legacyStore : {};
    return { ...clone(migrated), ...clone(compatibility) };
}

function goalStatus(status: PathStatus): string {
    return status === 'in-progress' ? 'in_progress' : status;
}

function pathStatus(value: JsonValue | undefined): PathStatus {
    if (value === 'in_progress' || value === 'in-progress' || value === 'active') return 'in-progress';
    if (value === 'done' || value === 'completed') return 'done';
    if (value === 'cancelled' || value === 'canceled' || value === 'interrupted') return 'cancelled';
    return 'todo';
}

function projectGoal(entity: PathEntity, entities: PathEntity[]): JsonObject {
    const fields = legacyFields(entity);
    const childGoals = entities.filter(candidate =>
        (candidate.type === 'goal' || candidate.type === 'milestone') && candidate.parentId === entity.id,
    ).map(candidate => candidate.id);
    const tasks = entities.filter(candidate => candidate.type === 'action' && candidate.parentId === entity.id).map(candidate => candidate.id);
    return {
        ...fields,
        id: entity.id,
        title: entity.title,
        description: entity.description,
        status: goalStatus(entity.status),
        ...(entity.priority ? { priority: entity.priority } : {}),
        tags: clone(entity.tags),
        ...(entity.parentId ? { parentGoalId: entity.parentId } : {}),
        ...(entity.planned?.start ? { startDate: entity.planned.start } : {}),
        ...(entity.planned?.end ? { endDate: entity.planned.end, dueDate: entity.planned.end } : {}),
        ...(entity.completedAt ? { completedAt: entity.completedAt } : {}),
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        childGoals,
        subGoalIds: clone(childGoals),
        tasks,
    };
}

function projectTask(entity: PathEntity): JsonObject {
    return {
        ...legacyFields(entity),
        id: entity.id,
        title: entity.title,
        description: entity.description,
        status: entity.status,
        ...(entity.priority ? { priority: entity.priority } : {}),
        tags: clone(entity.tags),
        ...(entity.parentId ? { goalId: entity.parentId } : {}),
        ...(entity.planned?.start ? { startDate: entity.planned.start } : {}),
        ...(entity.planned?.end ? { dueDate: entity.planned.end } : {}),
        ...(entity.completedAt ? { completedAt: entity.completedAt } : {}),
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}

function projectFocusSession(entity: PathEntity): JsonObject {
    const fields = legacyFields(entity);
    const status = entity.status === 'in-progress' ? 'active' : entity.status === 'done' ? 'completed' : 'interrupted';
    return {
        ...fields,
        id: entity.id,
        ...(entity.parentId ? { taskId: entity.parentId } : {}),
        status,
        startedAt: entity.occurredAt ?? entity.createdAt,
        ...(entity.completedAt ? { endedAt: entity.completedAt } : {}),
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}

/** Projects the canonical document into the temporary Pinia-store dialect. */
export function projectLegacyStoreSnapshot(document: PathRepositoryDocument): LegacyStoreSnapshot {
    const entities = document.envelope.entities;
    const goals = entities.filter(entity => entity.type === 'goal' || entity.type === 'milestone').map(entity => projectGoal(entity, entities));
    const tasks = entities.filter(entity => entity.type === 'action').map(projectTask);
    const focusSessions = entities.filter(entity => entity.type === 'focus-session').map(projectFocusSession);

    // v0 kept focus sessions at the plugin root. Retain them until the first merge
    // promotes them to canonical entities.
    const legacy = isObject(document.envelope.extensions.legacy) ? document.envelope.extensions.legacy : {};
    const envelope = isObject(legacy.envelope) ? legacy.envelope : {};
    const fallback = Array.isArray(envelope.focusSessions)
        ? envelope.focusSessions.filter(isObject).filter(session => !focusSessions.some(current => current.id === session.id)).map(clone)
        : [];
    return { goals, tasks, focusSessions: [...focusSessions, ...fallback], settings: clone(document.settings) };
}

function canonicalEntity(raw: JsonObject, existing: PathEntity | undefined, kind: 'goal' | 'action' | 'focus-session'): PathEntity | undefined {
    const id = optionalText(raw.id);
    if (!id) return undefined;
    const createdAt = optionalText(raw.createdAt) ?? existing?.createdAt ?? EPOCH;
    const updatedAt = optionalText(raw.updatedAt) ?? existing?.updatedAt ?? createdAt;
    const start = optionalText(kind === 'focus-session' ? raw.startedAt : raw.startDate);
    const end = optionalText(kind === 'goal' ? raw.dueDate ?? raw.endDate : kind === 'action' ? raw.dueDate : raw.endedAt);
    const parentId = optionalText(kind === 'goal' ? raw.parentGoalId : kind === 'action' ? raw.goalId : raw.taskId);
    const extensions: JsonObject = { ...(existing ? clone(existing.extensions) : {}), legacyStore: clone(raw) };
    const planned: PathEntity['planned'] = start || end
        ? { ...(start ? { start: start as NonNullable<PathEntity['planned']>['start'] } : {}), ...(end ? { end: end as NonNullable<PathEntity['planned']>['end'] } : {}) }
        : undefined;
    return {
        id,
        type: kind === 'goal' && existing?.type === 'milestone' ? 'milestone' : kind,
        title: kind === 'focus-session' ? text(raw.title, existing?.title ?? 'Session de concentration') : text(raw.title, existing?.title),
        description: text(raw.description, existing?.description),
        status: pathStatus(raw.status),
        ...(raw.priority === 'low' || raw.priority === 'medium' || raw.priority === 'high' ? { priority: raw.priority } : existing?.priority ? { priority: existing.priority } : {}),
        ...(parentId ? { parentId } : {}),
        ...(planned ? { planned } : {}),
        ...(kind === 'focus-session' && start ? { occurredAt: start as ZonedInstant } : existing?.occurredAt ? { occurredAt: existing.occurredAt } : {}),
        ...(kind === 'focus-session' && end ? { completedAt: end as ZonedInstant } : optionalText(raw.completedAt) ? { completedAt: optionalText(raw.completedAt) as ZonedInstant } : existing?.completedAt ? { completedAt: existing.completedAt } : {}),
        createdAt: createdAt as ZonedInstant,
        updatedAt: updatedAt as ZonedInstant,
        tags: stringList(raw.tags).length || Array.isArray(raw.tags) ? stringList(raw.tags) : clone(existing?.tags ?? []),
        extensions,
    };
}

/** Replaces only store-managed entities while preserving canonical history and unknown data. */
export function mergeLegacyStoreSnapshot(document: PathRepositoryDocument, snapshot: LegacyStoreSnapshot): PathRepositoryDocument {
    const source = clone(document as unknown as JsonObject) as unknown as PathRepositoryDocument;
    const existing = new Map(source.envelope.entities.map(entity => [entity.id, entity]));
    const managed = [
        ...snapshot.goals.map(raw => canonicalEntity(raw, existing.get(optionalText(raw.id) ?? ''), 'goal')),
        ...snapshot.tasks.map(raw => canonicalEntity(raw, existing.get(optionalText(raw.id) ?? ''), 'action')),
        ...snapshot.focusSessions.map(raw => canonicalEntity(raw, existing.get(optionalText(raw.id) ?? ''), 'focus-session')),
    ].filter((entity): entity is PathEntity => Boolean(entity));
    const unmanaged = source.envelope.entities.filter(entity =>
        entity.type !== 'goal' && entity.type !== 'milestone' && entity.type !== 'action' && entity.type !== 'focus-session',
    );
    return {
        ...source,
        envelope: { ...source.envelope, entities: [...unmanaged, ...managed] },
        settings: clone(snapshot.settings),
    };
}
