import type { CivilDate, JsonObject, JsonValue, ZonedInstant } from './model.ts';
import { isCivilDate, isZonedInstant } from './primitives.ts';

export type LegacyDiagnosticCode = 'invalid-root' | 'unsafe-key' | 'invalid-collection' | 'invalid-record' | 'unknown-status' | 'ambiguous-date' | 'invalid-date' | 'inverted-date-range' | 'contradictory-date-alias' | 'contradictory-relation-alias' | 'orphan-relation' | 'relation-cycle';
export interface LegacyDiagnostic { code: LegacyDiagnosticCode; path: string; message: string }
export interface LegacyV0Record {
    kind: 'goal' | 'task'; id?: string; title?: string; status?: string;
    dates: { start?: CivilDate | ZonedInstant; end?: CivilDate | ZonedInstant; created?: ZonedInstant; updated?: ZonedInstant; completed?: ZonedInstant };
    relations: { parentId?: string; childIds: string[]; goalId?: string; taskIds: string[] };
    fields: JsonObject;
    extensions: { legacy: JsonObject };
}
export interface LegacyV0Envelope { schemaVersion: 0; goals: LegacyV0Record[]; tasks: LegacyV0Record[]; settings: JsonObject; extensions: { legacy: JsonObject } }
export interface LegacyV0DecodeResult { value?: LegacyV0Envelope; diagnostics: LegacyDiagnostic[] }

const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const common = ['id', 'title', 'status', 'startDate', 'createdAt', 'updatedAt', 'completedAt'];
const knownGoal = new Set([...common, 'description', 'category', 'progress', 'priority', 'tags', 'dueDate', 'endDate', 'timeframe', 'parentGoalId', 'childGoals', 'subGoalIds', 'tasks', 'metrics']);
const knownTask = new Set([...common, 'description', 'priority', 'tags', 'dueDate', 'goalId', 'notes', 'linkToOptimizer', 'linkToGenerator']);
const settingKeys = new Set(['lastActiveTab', 'folderStructure', 'monthLanguage', 'notesPath', 'timelineStartHour', 'timelineEndHour', 'defaultTasks']);
const knownStatuses = new Set(['todo', 'in-progress', 'in_progress', 'done', 'completed', 'cancelled', 'canceled']);
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

function clone(value: unknown, path: string, diagnostics: LegacyDiagnostic[]): JsonValue | undefined {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
    if (Array.isArray(value)) return value.flatMap((item, i) => { const copied = clone(item, `${path}[${i}]`, diagnostics); return copied === undefined ? [] : [copied]; });
    if (!object(value)) return undefined;
    const result = Object.create(null) as JsonObject;
    for (const [key, item] of Object.entries(value)) {
        if (unsafe.has(key)) { diagnostics.push({ code: 'unsafe-key', path: `${path}.${key}`, message: `Rejected unsafe key ${key}` }); continue; }
        const copied = clone(item, `${path}.${key}`, diagnostics); if (copied !== undefined) result[key] = copied;
    }
    return result;
}

function date(value: unknown, path: string, diagnostics: LegacyDiagnostic[]): CivilDate | ZonedInstant | undefined {
    if (isCivilDate(value)) { diagnostics.push({ code: 'ambiguous-date', path, message: 'Civil date has no time zone in a mixed legacy date field' }); return value; }
    if (isZonedInstant(value)) return value;
    if (value !== undefined) diagnostics.push({ code: 'invalid-date', path, message: 'Expected YYYY-MM-DD or an instant with Z/offset' });
    return undefined;
}

function record(raw: unknown, kind: 'goal' | 'task', index: number, diagnostics: LegacyDiagnostic[]): LegacyV0Record | undefined {
    const path = `${kind}s[${index}]`; if (!object(raw)) { diagnostics.push({ code: 'invalid-record', path, message: 'Expected object' }); return; }
    const fields = Object.create(null) as JsonObject, extensions = Object.create(null) as JsonObject, known = kind === 'goal' ? knownGoal : knownTask;
    for (const [key, value] of Object.entries(raw)) {
        if (unsafe.has(key)) { diagnostics.push({ code: 'unsafe-key', path: `${path}.${key}`, message: `Rejected unsafe key ${key}` }); continue; }
        const copied = clone(value, `${path}.${key}`, diagnostics); if (copied !== undefined) (known.has(key) ? fields : extensions)[key] = copied;
    }
    const start = date(raw.startDate, `${path}.startDate`, diagnostics), due = date(raw.dueDate, `${path}.dueDate`, diagnostics), endAlias = date(raw.endDate, `${path}.endDate`, diagnostics);
    if (raw.status !== undefined && (typeof raw.status !== 'string' || !knownStatuses.has(raw.status))) diagnostics.push({ code: 'unknown-status', path: `${path}.status`, message: 'Unrecognized legacy status was preserved without coercion' });
    if (due && endAlias && due !== endAlias) diagnostics.push({ code: 'contradictory-date-alias', path, message: 'dueDate and endDate disagree' });
    const resolvedEnd = due ?? endAlias;
    if (start && resolvedEnd && Date.parse(start) > Date.parse(resolvedEnd)) diagnostics.push({ code: 'inverted-date-range', path, message: 'Legacy start date is after its end date' });
    const zoned = (value: unknown, key: string) => { if (value !== undefined && !isZonedInstant(value)) diagnostics.push({ code: 'invalid-date' as const, path: `${path}.${key}`, message: 'Expected instant with Z/offset' }); return isZonedInstant(value) ? value : undefined; };
    const created = zoned(raw.createdAt, 'createdAt');
    const updated = zoned(raw.updatedAt, 'updatedAt');
    const completed = zoned(raw.completedAt, 'completedAt');
    return { kind, ...(typeof raw.id === 'string' ? { id: raw.id } : {}), ...(typeof raw.title === 'string' ? { title: raw.title } : {}), ...(typeof raw.status === 'string' ? { status: raw.status } : {}),
        dates: { ...(start ? { start } : {}), ...(resolvedEnd ? { end: resolvedEnd } : {}), ...(created ? { created } : {}), ...(updated ? { updated } : {}), ...(completed ? { completed } : {}) },
        relations: { ...(typeof raw.parentGoalId === 'string' ? { parentId: raw.parentGoalId } : {}), childIds: [...strings(raw.childGoals), ...strings(raw.subGoalIds)], ...(typeof raw.goalId === 'string' ? { goalId: raw.goalId } : {}), taskIds: strings(raw.tasks) }, fields, extensions: { legacy: extensions } };
}

function relations(goals: LegacyV0Record[], tasks: LegacyV0Record[], diagnostics: LegacyDiagnostic[]) {
    const byGoal = new Map(goals.flatMap(g => g.id ? [[g.id, g] as const] : [])), taskIds = new Set(tasks.flatMap(t => t.id ? [t.id] : []));
    for (const goal of goals) {
        if (goal.relations.parentId && !byGoal.has(goal.relations.parentId)) diagnostics.push({ code: 'orphan-relation', path: `goal:${goal.id}.parentGoalId`, message: 'Parent goal is missing' });
        for (const childId of goal.relations.childIds) { const child = byGoal.get(childId); if (!child) diagnostics.push({ code: 'orphan-relation', path: `goal:${goal.id}.children`, message: `Child ${childId} is missing` }); else if (child.relations.parentId !== goal.id) diagnostics.push({ code: 'contradictory-relation-alias', path: `goal:${goal.id}.children`, message: `Child ${childId} declares another parent` }); }
        for (const id of goal.relations.taskIds) if (!taskIds.has(id)) diagnostics.push({ code: 'orphan-relation', path: `goal:${goal.id}.tasks`, message: `Task ${id} is missing` });
        const seen = new Set<string>(); let cursor: LegacyV0Record | undefined = goal;
        while (cursor?.id) { if (seen.has(cursor.id)) { diagnostics.push({ code: 'relation-cycle', path: `goal:${goal.id}`, message: 'Parent cycle detected' }); break; } seen.add(cursor.id); cursor = cursor.relations.parentId ? byGoal.get(cursor.relations.parentId) : undefined; }
    }
    for (const task of tasks) if (task.relations.goalId && !byGoal.has(task.relations.goalId)) diagnostics.push({ code: 'orphan-relation', path: `task:${task.id}.goalId`, message: 'Goal is missing' });
}

export function decodeLegacyV0(input: unknown): LegacyV0DecodeResult {
    const diagnostics: LegacyDiagnostic[] = []; if (!object(input)) return { diagnostics: [{ code: 'invalid-root', path: '$', message: 'Expected object' }] };
    const rawGoals = input.goals ?? [], rawTasks = input.tasks ?? [];
    if (!Array.isArray(rawGoals)) diagnostics.push({ code: 'invalid-collection', path: 'goals', message: 'Expected array' });
    if (!Array.isArray(rawTasks)) diagnostics.push({ code: 'invalid-collection', path: 'tasks', message: 'Expected array' });
    const goals = (Array.isArray(rawGoals) ? rawGoals : []).flatMap((v, i) => record(v, 'goal', i, diagnostics) ?? []), tasks = (Array.isArray(rawTasks) ? rawTasks : []).flatMap((v, i) => record(v, 'task', i, diagnostics) ?? []); relations(goals, tasks, diagnostics);
    const settings = Object.create(null) as JsonObject, extra = Object.create(null) as JsonObject;
    for (const [key, value] of Object.entries(input)) { if (unsafe.has(key)) { diagnostics.push({ code: 'unsafe-key', path: `$.${key}`, message: `Rejected unsafe key ${key}` }); continue; } if (key === 'goals' || key === 'tasks') continue; const copied = clone(value, `$.${key}`, diagnostics); if (copied !== undefined) (settingKeys.has(key) ? settings : extra)[key] = copied; }
    return { value: { schemaVersion: 0, goals, tasks, settings, extensions: { legacy: extra } }, diagnostics };
}
