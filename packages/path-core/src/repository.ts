import { decodeLegacyV0, type LegacyDiagnostic } from './legacy-v0.ts';
import { isCivilDate, isZonedInstant } from './primitives.ts';
import { migrateLegacyV0, type MigrationV0Diagnostic } from './migration-v0.ts';
import {
    PATH_SCHEMA_VERSION,
    type JsonObject,
    type JsonValue,
    type PathEntity,
    type PathEnvelope,
    type PathEvent,
} from './model.ts';

export const PATH_REPOSITORY_VERSION = 1 as const;

export interface PathRepositoryDocument {
    repositoryVersion: typeof PATH_REPOSITORY_VERSION;
    envelope: PathEnvelope;
    settings: JsonObject;
    extensions: JsonObject;
}

export interface PathRepositoryAdapter {
    load(): Promise<unknown>;
    save(document: JsonObject): Promise<void>;
}

export interface PathRepositoryLoadResult {
    document: PathRepositoryDocument;
    migrated: boolean;
    diagnostics: readonly (LegacyDiagnostic | MigrationV0Diagnostic)[];
}

export class PathRepositoryReadError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'PathRepositoryReadError';
    }
}

export class PathRepositoryWriteError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'PathRepositoryWriteError';
    }
}

export class PathRepositoryConflictError extends Error {
    readonly expectedRevision: number;
    readonly actualRevision: number;

    constructor(expectedRevision: number, actualRevision: number) {
        super(`Stale Chemin revision: expected ${expectedRevision}, current revision is ${actualRevision}`);
        this.name = 'PathRepositoryConflictError';
        this.expectedRevision = expectedRevision;
        this.actualRevision = actualRevision;
    }
}

const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const entityTypes = new Set(['dream', 'goal', 'milestone', 'action', 'habit', 'focus-session', 'evidence', 'reflection']);
const statuses = new Set(['todo', 'in-progress', 'done', 'cancelled']);
const priorities = new Set(['low', 'medium', 'high']);
const eventTypes = new Set(['entity-created', 'planned-period-changed', 'entity-completed', 'entity-reopened', 'entity-reparented', 'entity-updated', 'entity-deleted', 'focus-session-started', 'focus-session-ended', 'evidence-recorded', 'reflection-recorded']);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertJsonValue(value: unknown, path = '$', seen = new Set<object>()): asserts value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (Array.isArray(value)) {
        if (seen.has(value)) throw new TypeError(`${path} contains a circular reference`);
        seen.add(value);
        value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, seen));
        seen.delete(value);
        return;
    }
    if (!isObject(value)) throw new TypeError(`${path} is not JSON-safe`);
    if (seen.has(value)) throw new TypeError(`${path} contains a circular reference`);
    seen.add(value);
    for (const [key, item] of Object.entries(value)) {
        if (unsafeKeys.has(key)) throw new TypeError(`${path}.${key} is not a safe JSON key`);
        assertJsonValue(item, `${path}.${key}`, seen);
    }
    seen.delete(value);
}

/** Produces a detached, prototype-free-at-the-boundary JSON value. */
export function cloneJsonSafe<T extends JsonValue>(value: T): T {
    assertJsonValue(value);
    return JSON.parse(JSON.stringify(value)) as T;
}

function requireString(value: unknown, path: string): asserts value is string {
    if (typeof value !== 'string') throw new TypeError(`${path} must be a string`);
}

function requireStringArray(value: unknown, path: string): asserts value is string[] {
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new TypeError(`${path} must be a string array`);
}

function validatePeriod(value: unknown, path: string): void {
    if (!isObject(value)) throw new TypeError(`${path} must be an object`);
    if (value.start !== undefined) requireString(value.start, `${path}.start`);
    if (value.end !== undefined) requireString(value.end, `${path}.end`);
    for (const field of ['start', 'end']) if (value[field] !== undefined && !isCivilDate(value[field]) && !isZonedInstant(value[field])) throw new TypeError(`${path}.${field} is not a valid date`);
    if (value.start !== undefined && value.end !== undefined) {
        if (isCivilDate(value.start) !== isCivilDate(value.end)) throw new TypeError(`${path} mixes date kinds`);
        const start = isCivilDate(value.start) ? value.start : Date.parse(value.start as string);
        const end = isCivilDate(value.end) ? value.end : Date.parse(value.end as string);
        if (start > end) throw new TypeError(`${path} is inverted`);
    }
}

function validateEntity(value: unknown, path: string): asserts value is PathEntity {
    if (!isObject(value)) throw new TypeError(`${path} must be an object`);
    requireString(value.id, `${path}.id`);
    requireString(value.type, `${path}.type`);
    if (!entityTypes.has(value.type)) throw new TypeError(`${path}.type is unsupported`);
    requireString(value.title, `${path}.title`);
    requireString(value.description, `${path}.description`);
    if (value.why !== undefined) requireString(value.why, `${path}.why`);
    requireString(value.status, `${path}.status`);
    if (!statuses.has(value.status)) throw new TypeError(`${path}.status is unsupported`);
    if (value.priority !== undefined && (typeof value.priority !== 'string' || !priorities.has(value.priority))) throw new TypeError(`${path}.priority is unsupported`);
    if (value.parentId !== undefined) requireString(value.parentId, `${path}.parentId`);
    if (value.planned !== undefined) validatePeriod(value.planned, `${path}.planned`);
    for (const key of ['completedAt', 'deletedAt', 'occurredAt', 'createdAt', 'updatedAt'] as const) if (value[key] !== undefined && !isZonedInstant(value[key])) throw new TypeError(`${path}.${key} is not a valid instant`);
    requireString(value.createdAt, `${path}.createdAt`);
    requireString(value.updatedAt, `${path}.updatedAt`);
    requireStringArray(value.tags, `${path}.tags`);
    if (!isObject(value.extensions)) throw new TypeError(`${path}.extensions must be an object`);
}

function validateEvent(value: unknown, path: string): asserts value is PathEvent {
    if (!isObject(value)) throw new TypeError(`${path} must be an object`);
    requireString(value.id, `${path}.id`);
    requireString(value.type, `${path}.type`);
    if (!eventTypes.has(value.type)) throw new TypeError(`${path}.type is unsupported`);
    requireString(value.entityId, `${path}.entityId`);
    requireString(value.occurredAt, `${path}.occurredAt`);
    requireString(value.recordedAt, `${path}.recordedAt`);
    if (!isZonedInstant(value.occurredAt) || !isZonedInstant(value.recordedAt)) throw new TypeError(`${path} has an invalid instant`);
    if (value.previousPlanned !== undefined) validatePeriod(value.previousPlanned, `${path}.previousPlanned`);
    if (value.nextPlanned !== undefined) validatePeriod(value.nextPlanned, `${path}.nextPlanned`);
    if (value.relatedEntityId !== undefined) requireString(value.relatedEntityId, `${path}.relatedEntityId`);
    if (value.previousParentId !== undefined) requireString(value.previousParentId, `${path}.previousParentId`);
    if (value.nextParentId !== undefined) requireString(value.nextParentId, `${path}.nextParentId`);
    if (value.previousValues !== undefined && !isObject(value.previousValues)) throw new TypeError(`${path}.previousValues must be an object`);
    if (value.nextValues !== undefined && !isObject(value.nextValues)) throw new TypeError(`${path}.nextValues must be an object`);
    if (!isObject(value.extensions)) throw new TypeError(`${path}.extensions must be an object`);
}

export function decodeCanonical(input: unknown): PathRepositoryDocument | undefined {
    if (!isObject(input) || input.repositoryVersion !== PATH_REPOSITORY_VERSION) return undefined;
    assertJsonValue(input);
    if (!isObject(input.envelope)) throw new TypeError('$.envelope must be an object');
    const envelope = input.envelope;
    if (envelope.schemaVersion !== PATH_SCHEMA_VERSION) throw new TypeError('$.envelope.schemaVersion is unsupported');
    if (!Number.isSafeInteger(envelope.revision) || (envelope.revision as number) < 0) throw new TypeError('$.envelope.revision must be a non-negative safe integer');
    if (!Array.isArray(envelope.entities)) throw new TypeError('$.envelope.entities must be an array');
    envelope.entities.forEach((entity, index) => validateEntity(entity, `$.envelope.entities[${index}]`));
    if (!Array.isArray(envelope.events)) throw new TypeError('$.envelope.events must be an array');
    envelope.events.forEach((event, index) => validateEvent(event, `$.envelope.events[${index}]`));
    const identities = new Set<string>();
    for (const record of [...envelope.entities, ...envelope.events] as Array<{ id: string }>) {
        if (!record.id.trim() || identities.has(record.id)) throw new TypeError('Canonical identities must be non-empty and unique');
        identities.add(record.id);
    }
    if (!isObject(envelope.extensions) || !isObject(input.settings) || !isObject(input.extensions)) throw new TypeError('Canonical extensions and settings must be objects');
    return cloneJsonSafe(input as unknown as JsonObject) as unknown as PathRepositoryDocument;
}

function decode(input: unknown): PathRepositoryLoadResult {
    // Repair only a known old migration output, retaining every original period.
    // Arbitrary malformed canonical input remains a hard error.
    const recoveryDiagnostics: MigrationV0Diagnostic[] = [];
    if (isObject(input) && input.repositoryVersion === PATH_REPOSITORY_VERSION
        && isObject(input.envelope) && input.envelope.schemaVersion === PATH_SCHEMA_VERSION
        && Array.isArray(input.envelope.entities)) {
        input = cloneJsonSafe(input as JsonObject);
        for (const [index, entity] of ((input as any).envelope.entities as unknown[]).entries()) {
            if (!isObject(entity) || entity.planned === undefined || !isObject(entity.extensions)) continue;
            const legacy = entity.extensions.legacy;
            if (!isObject(legacy) || !['goal', 'task'].includes(legacy.kind as string) || !isObject(legacy.fields)) continue;
            try { validatePeriod(entity.planned, '$.planned'); }
            catch {
                if (legacy.invalidPlanned !== undefined && JSON.stringify(legacy.invalidPlanned) !== JSON.stringify(entity.planned)) throw new TypeError('Legacy period recovery conflicts with preserved data');
                legacy.invalidPlanned = entity.planned;
                delete entity.planned;
                recoveryDiagnostics.push({ code: 'invalid-period-preserved', path: `$.envelope.entities[${index}].planned`, message: 'Old migrated period retained in extensions.legacy.invalidPlanned; replan explicitly' });
            }
        }
    }
    const canonical = decodeCanonical(input);
    if (canonical) return { document: canonical, migrated: recoveryDiagnostics.length > 0, diagnostics: recoveryDiagnostics };
    if (isObject(input) && ('repositoryVersion' in input || 'schemaVersion' in input)) {
        throw new TypeError('Unsupported or malformed Chemin repository document');
    }
    const legacy = decodeLegacyV0(input);
    if (!legacy.value) throw new TypeError(`Legacy Chemin data is invalid: ${legacy.diagnostics.map(item => item.message).join('; ')}`);
    const migration = migrateLegacyV0(legacy.value);
    return {
        document: {
            repositoryVersion: PATH_REPOSITORY_VERSION,
            envelope: migration.value,
            settings: cloneJsonSafe(legacy.value.settings),
            extensions: {},
        },
        migrated: true,
        diagnostics: [...legacy.diagnostics, ...migration.diagnostics],
    };
}

export class PathRepository {
    private readonly adapter: PathRepositoryAdapter;
    private revision: number | undefined;
    private writeTail: Promise<void> = Promise.resolve();

    constructor(adapter: PathRepositoryAdapter) {
        this.adapter = adapter;
    }

    async load(): Promise<PathRepositoryLoadResult> {
        try {
            const result = decode(await this.adapter.load());
            this.revision = result.document.envelope.revision;
            return { ...result, document: cloneJsonSafe(result.document as unknown as JsonObject) as unknown as PathRepositoryDocument };
        } catch (error) {
            if (error instanceof PathRepositoryReadError) throw error;
            throw new PathRepositoryReadError('Unable to load Chemin data safely', { cause: error });
        }
    }

    save(document: PathRepositoryDocument, expectedRevision: number): Promise<PathRepositoryDocument> {
        return this.write(document, expectedRevision, false);
    }

    /** Exact snapshot replacement. Callers must validate and back up the destination first. */
    restore(document: PathRepositoryDocument, expectedRevision: number): Promise<PathRepositoryDocument> {
        return this.write(document, expectedRevision, true);
    }

    private write(document: PathRepositoryDocument, expectedRevision: number, exact: boolean): Promise<PathRepositoryDocument> {
        const operation = this.writeTail.then(async () => {
            if (this.revision === undefined) throw new PathRepositoryConflictError(expectedRevision, -1);
            if (expectedRevision !== this.revision) throw new PathRepositoryConflictError(expectedRevision, this.revision);
            const candidate = cloneJsonSafe(document as unknown as JsonObject) as unknown as PathRepositoryDocument;
            if (candidate.repositoryVersion !== PATH_REPOSITORY_VERSION || candidate.envelope.schemaVersion !== PATH_SCHEMA_VERSION) throw new TypeError('Cannot save an unsupported Chemin document version');
            if (!exact) candidate.envelope.revision = this.revision + 1;
            const validated = decodeCanonical(candidate);
            if (!validated) throw new TypeError('Cannot save a malformed Chemin document');
            try {
                await this.adapter.save(cloneJsonSafe(validated as unknown as JsonObject));
            } catch (error) {
                throw new PathRepositoryWriteError('Unable to save Chemin data', { cause: error });
            }
            this.revision = validated.envelope.revision;
            return cloneJsonSafe(validated as unknown as JsonObject) as unknown as PathRepositoryDocument;
        });
        this.writeTail = operation.then(() => undefined, () => undefined);
        return operation;
    }
}
