import type { JsonObject, JsonValue, PathEntity, ZonedInstant } from './model.ts';
import { cloneJsonSafe, type PathRepositoryDocument } from './repository.ts';
import { isZonedInstant } from './primitives.ts';

function object(value: JsonValue | undefined): JsonObject | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

/** Promote previously preserved legacy sessions; never discard their original payload. */
export function migratePortableFocus(source: PathRepositoryDocument): PathRepositoryDocument {
    const document = cloneJsonSafe(source as unknown as JsonObject) as unknown as PathRepositoryDocument;
    const legacy = object(object(document.envelope.extensions.legacy)?.envelope);
    const raw = legacy?.focusSessions;
    if (raw === undefined) return document;
    const sessions = Array.isArray(raw) ? raw : object(raw)?.sessions;
    if (!Array.isArray(sessions)) throw new Error('Anciennes sessions Focus illisibles : export interrompu, données conservées.');
    const ids = new Set(document.envelope.entities.map(entity => entity.id));
    const legacyIds = new Set<string>();
    for (const value of sessions) {
        const session = object(value);
        if (!session || typeof session.id !== 'string' || !session.id.trim() || legacyIds.has(session.id)) {
            throw new Error('Identifiant de session Focus historique invalide ou dupliqué.');
        }
        legacyIds.add(session.id);
        const existing = document.envelope.entities.find(entity => object(entity.extensions.legacyFocus)?.id === session.id);
        if (existing) {
            if (JSON.stringify(existing.extensions.legacyFocus) !== JSON.stringify(session)) throw new Error('Session Focus migrée incohérente avec sa source historique.');
            continue;
        }
        if (typeof session.taskId !== 'string' || !session.taskId || !isZonedInstant(session.startedAt)
            || !isZonedInstant(session.createdAt) || !isZonedInstant(session.updatedAt)
            || !['active', 'completed', 'interrupted'].includes(String(session.status))
            || !['focus', 'creation', 'administration'].includes(String(session.mode))
            || (session.endedAt !== undefined && !isZonedInstant(session.endedAt))) {
            throw new Error('Session Focus historique invalide : données originales conservées.');
        }
        if (session.status !== 'active' && !isZonedInstant(session.endedAt)) throw new Error('Fin de session Focus historique manquante.');
        if (session.endedAt && Date.parse(String(session.endedAt)) < Date.parse(session.startedAt)) throw new Error('Dates Focus historiques inversées.');
        if (session.durationMinutes !== undefined && (typeof session.durationMinutes !== 'number' || session.durationMinutes < 0)) throw new Error('Durée Focus historique invalide.');
        if (ids.has(session.id) || document.envelope.events.some(event => event.id === session.id)) throw new Error('Collision entre une ancienne session Focus et un objet existant.');
        const entity: PathEntity = {
            id: session.id, type: 'focus-session', title: 'Session de focus', description: '',
            status: session.status === 'active' ? 'in-progress' : session.status === 'completed' ? 'done' : 'cancelled',
            parentId: session.taskId, occurredAt: session.startedAt,
            createdAt: session.createdAt, updatedAt: session.updatedAt, tags: [],
            ...(session.endedAt ? { completedAt: session.endedAt as ZonedInstant } : {}),
            extensions: { ...session, legacyFocus: session },
        };
        document.envelope.entities.push(entity);
        ids.add(entity.id);
    }
    return document;
}
