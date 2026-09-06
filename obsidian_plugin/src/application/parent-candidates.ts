import { createEntity, reparent } from '../domain/path/commands.ts';
import type { PathEntityType, PathEnvelope, ZonedInstant } from '../domain/path/model.ts';

/** Ask the canonical commands: UI filtering never owns a second relationship matrix. */
export function parentCandidates(envelope: PathEnvelope, type: Exclude<PathEntityType, 'focus-session'>, id: string) {
    const existing = envelope.entities.find(entity => entity.id === id && !entity.deletedAt);
    const occupied = new Set([id, ...envelope.entities.map(entity => entity.id), ...envelope.events.flatMap(event => [event.id, String(event.extensions.commandId ?? '')])]);
    let previewId = 'parent-preview';
    while (occupied.has(previewId)) previewId += '-';
    const deps = { commandId: previewId, now: () => '2026-01-01T00:00:00.000Z' as ZonedInstant, createId: () => previewId };
    return envelope.entities.filter(candidate => {
        if (candidate.deletedAt) return false;
        if (existing?.parentId === candidate.id) return true;
        const result = existing
            ? reparent(envelope, id, candidate.id, deps)
            : createEntity(envelope, { id, type, title: 'Aperçu', parentId: candidate.id }, deps);
        return result.accepted;
    });
}
