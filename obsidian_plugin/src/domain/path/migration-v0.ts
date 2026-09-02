import type {
    JsonObject,
    JsonValue,
    PathEntity,
    PathEnvelope,
    PathPriority,
    PathStatus,
    ZonedInstant,
} from './model.ts';
import { PATH_SCHEMA_VERSION } from './model.ts';
import type { LegacyV0Envelope, LegacyV0Record } from './legacy-v0.ts';

export type MigrationV0DiagnosticCode =
    | 'generated-id'
    | 'duplicate-id'
    | 'unknown-status-preserved'
    | 'invalid-priority-preserved'
    | 'missing-created-at'
    | 'missing-updated-at'
    | 'ambiguous-inverse-relation'
    | 'conflicting-relation-preserved'
    | 'orphan-relation-preserved';

export interface MigrationV0Diagnostic {
    code: MigrationV0DiagnosticCode;
    path: string;
    message: string;
}

export interface MigrationV0Result {
    value: PathEnvelope;
    diagnostics: MigrationV0Diagnostic[];
    migrated: boolean;
}

const EPOCH = '1970-01-01T00:00:00.000Z' as ZonedInstant;
const statuses: Record<string, PathStatus> = {
    todo: 'todo',
    'in-progress': 'in-progress',
    in_progress: 'in-progress',
    done: 'done',
    completed: 'done',
    cancelled: 'cancelled',
    canceled: 'cancelled',
};
const priorities = new Set<PathPriority>(['low', 'medium', 'high']);

function canonicalJson(value: JsonValue): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

function hash(value: string): string {
    let result = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 0x01000193);
    }
    return (result >>> 0).toString(16).padStart(8, '0');
}

function jsonObject(entries: Record<string, JsonValue | undefined>): JsonObject {
    const result = Object.create(null) as JsonObject;
    for (const [key, value] of Object.entries(entries)) if (value !== undefined) result[key] = value;
    return result;
}

function field(record: LegacyV0Record, key: string): JsonValue | undefined {
    return record.fields[key];
}

function text(record: LegacyV0Record, key: string, fallback = ''): string {
    const value = field(record, key);
    return typeof value === 'string' ? value : fallback;
}

function stringList(record: LegacyV0Record, key: string): string[] {
    const value = field(record, key);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

interface IdentifiedRecord {
    record: LegacyV0Record;
    id: string;
    path: string;
}

function identify(
    records: LegacyV0Record[],
    kind: 'goal' | 'task',
    occupied: Set<string>,
    diagnostics: MigrationV0Diagnostic[],
): IdentifiedRecord[] {
    return records.map((record, index) => {
        const path = `${kind}s[${index}]`;
        const signature = canonicalJson(jsonObject({
            kind,
            index,
            fields: record.fields,
            unknown: record.extensions.legacy,
            relations: record.relations as unknown as JsonValue,
            dates: record.dates as unknown as JsonValue,
        }));
        const base = record.id && record.id.length > 0
            ? record.id
            : `legacy-${kind}-${index}-${hash(signature)}`;
        if (!record.id) diagnostics.push({
            code: 'generated-id', path: `${path}.id`,
            message: `Missing legacy identifier mapped deterministically to ${base}`,
        });
        let id = base;
        let suffix = 2;
        while (occupied.has(id)) id = `${base}~${suffix++}`;
        if (id !== base) diagnostics.push({
            code: 'duplicate-id', path: `${path}.id`,
            message: `Duplicate identifier ${base} mapped deterministically to ${id}`,
        });
        occupied.add(id);
        return { record, id, path };
    });
}

function inverseOwners(records: IdentifiedRecord[], relation: 'childIds' | 'taskIds'): Map<string, string[]> {
    const owners = new Map<string, string[]>();
    for (const { record, id } of records) for (const childId of record.relations[relation]) {
        const current = owners.get(childId) ?? [];
        if (!current.includes(id)) current.push(id);
        owners.set(childId, current);
    }
    return owners;
}

function resolveParent(
    item: IdentifiedRecord,
    directParent: string | undefined,
    inverse: Map<string, string[]>,
    validGoals: Set<string>,
    diagnostics: MigrationV0Diagnostic[],
): { parentId?: string; legacy: JsonObject } {
    const owners = inverse.get(item.record.id ?? item.id) ?? [];
    const relationLegacy = jsonObject({
        declaredParentId: directParent,
        inverseParentIds: owners,
    });

    if (directParent) {
        if (!validGoals.has(directParent)) diagnostics.push({
            code: 'orphan-relation-preserved', path: `${item.path}.relations`,
            message: `Declared parent ${directParent} does not resolve and was preserved`,
        });
        if (owners.length > 0 && !owners.includes(directParent)) diagnostics.push({
            code: 'conflicting-relation-preserved', path: `${item.path}.relations`,
            message: 'Child-owned parent takes precedence; conflicting inverse aliases were preserved',
        });
        return { parentId: directParent, legacy: relationLegacy };
    }
    if (owners.length === 1) return { parentId: owners[0], legacy: relationLegacy };
    if (owners.length > 1) diagnostics.push({
        code: 'ambiguous-inverse-relation', path: `${item.path}.relations`,
        message: 'Several inverse aliases claim this child; no parent was guessed',
    });
    return { legacy: relationLegacy };
}

function timestamps(item: IdentifiedRecord, diagnostics: MigrationV0Diagnostic[]) {
    const createdAt = item.record.dates.created ?? item.record.dates.updated ?? EPOCH;
    const updatedAt = item.record.dates.updated ?? item.record.dates.created ?? EPOCH;
    if (!item.record.dates.created) diagnostics.push({
        code: 'missing-created-at', path: `${item.path}.createdAt`,
        message: `Missing creation instant mapped deterministically to ${createdAt}`,
    });
    if (!item.record.dates.updated) diagnostics.push({
        code: 'missing-updated-at', path: `${item.path}.updatedAt`,
        message: `Missing update instant mapped deterministically to ${updatedAt}`,
    });
    return { createdAt, updatedAt };
}

function entity(
    item: IdentifiedRecord,
    parent: { parentId?: string; legacy: JsonObject },
    diagnostics: MigrationV0Diagnostic[],
): PathEntity {
    const rawStatus = item.record.status;
    const status = rawStatus ? statuses[rawStatus] : undefined;
    if (rawStatus && !status) diagnostics.push({
        code: 'unknown-status-preserved', path: `${item.path}.status`,
        message: `Unknown status ${rawStatus} was preserved; canonical status defaults to todo`,
    });
    const rawPriority = field(item.record, 'priority');
    const priority = typeof rawPriority === 'string' && priorities.has(rawPriority as PathPriority)
        ? rawPriority as PathPriority
        : undefined;
    if (rawPriority !== undefined && !priority) diagnostics.push({
        code: 'invalid-priority-preserved', path: `${item.path}.priority`,
        message: 'Invalid priority was preserved without coercion',
    });
    const { createdAt, updatedAt } = timestamps(item, diagnostics);
    const planned = item.record.dates.start || item.record.dates.end
        ? { ...(item.record.dates.start ? { start: item.record.dates.start } : {}), ...(item.record.dates.end ? { end: item.record.dates.end } : {}) }
        : undefined;
    const legacy = jsonObject({
        kind: item.record.kind,
        fields: item.record.fields,
        unknown: item.record.extensions.legacy,
        relations: parent.legacy,
        ...(rawStatus && !status ? { unmappedStatus: rawStatus } : {}),
    });

    return {
        id: item.id,
        // A legacy child goal is not automatically a milestone: hierarchy alone
        // does not prove that product meaning. A later explicit migration may
        // classify milestones while retaining the stable identifier.
        type: item.record.kind === 'task' ? 'action' : 'goal',
        title: item.record.title ?? '',
        description: text(item.record, 'description'),
        status: status ?? 'todo',
        ...(priority ? { priority } : {}),
        ...(parent.parentId ? { parentId: parent.parentId } : {}),
        ...(planned ? { planned } : {}),
        ...(item.record.dates.completed ? { completedAt: item.record.dates.completed } : {}),
        createdAt,
        updatedAt,
        tags: stringList(item.record, 'tags'),
        extensions: { legacy },
    };
}

function isPathEnvelope(value: LegacyV0Envelope | PathEnvelope): value is PathEnvelope {
    return value.schemaVersion === PATH_SCHEMA_VERSION && 'entities' in value && 'events' in value;
}

/** Pure v0-to-v1 migration. Canonical input is returned unchanged as a second-run no-op. */
export function migrateLegacyV0(input: LegacyV0Envelope | PathEnvelope): MigrationV0Result {
    if (isPathEnvelope(input)) return { value: input, diagnostics: [], migrated: false };

    const diagnostics: MigrationV0Diagnostic[] = [];
    const occupied = new Set<string>();
    const goals = identify(input.goals, 'goal', occupied, diagnostics);
    const tasks = identify(input.tasks, 'task', occupied, diagnostics);
    const goalIds = new Set(goals.map(({ id }) => id));
    const goalInverse = inverseOwners(goals, 'childIds');
    const taskInverse = inverseOwners(goals, 'taskIds');
    const entities: PathEntity[] = [];

    for (const goal of goals) {
        const parent = resolveParent(goal, goal.record.relations.parentId, goalInverse, goalIds, diagnostics);
        entities.push(entity(goal, parent, diagnostics));
    }
    for (const task of tasks) {
        const parent = resolveParent(task, task.record.relations.goalId, taskInverse, goalIds, diagnostics);
        entities.push(entity(task, parent, diagnostics));
    }

    return {
        value: {
            schemaVersion: PATH_SCHEMA_VERSION,
            revision: 0,
            entities,
            events: [],
            extensions: {
                legacy: jsonObject({ settings: input.settings, envelope: input.extensions.legacy }),
            },
        },
        diagnostics,
        migrated: true,
    };
}
