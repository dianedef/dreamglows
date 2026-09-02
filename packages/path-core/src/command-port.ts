import {
    createEntity,
    deleteEntity,
    endFocusSession,
    startFocusSession,
    updateEntity,
    complete,
    reparent,
    reopen,
    resize,
    reschedule,
    schedule,
    type PathCommandRejection,
    type PathCommandResult,
    type CreateEntityInput,
    type UpdateEntityInput,
    type StartFocusInput,
    type EndFocusInput,
} from './commands.ts';
import type { PathEvent, PlannedPeriod, ZonedInstant } from './model.ts';
import type { PathRepositoryDocument } from './repository.ts';

export type PathUiCommand =
    | { type: 'create-entity'; commandId: string; input: CreateEntityInput }
    | { type: 'update-entity'; commandId: string; entityId: string; patch: UpdateEntityInput }
    | { type: 'delete-entity'; commandId: string; entityId: string }
    | { type: 'start-focus-session'; commandId: string; input: StartFocusInput }
    | { type: 'end-focus-session'; commandId: string; entityId: string; input: EndFocusInput }
    | { type: 'schedule'; commandId: string; entityId: string; planned: PlannedPeriod }
    | { type: 'reschedule'; commandId: string; entityId: string; planned: PlannedPeriod }
    | { type: 'complete'; commandId: string; entityId: string }
    | { type: 'reopen'; commandId: string; entityId: string }
    | { type: 'reparent'; commandId: string; entityId: string; nextParentId?: string }
    | { type: 'resize'; commandId: string; entityId: string; patch: PlannedPeriod };

export type PathCommandExecution =
    | { accepted: true; revision: number; entityId: string; eventId: string; replayed: boolean }
    | { accepted: false; reason: PathCommandRejection };

export type PathDocumentUpdater = (
    current: PathRepositoryDocument,
) => PathRepositoryDocument | undefined | Promise<PathRepositoryDocument | undefined>;

export interface PathCommandPortDependencies {
    updateDocument(updater: PathDocumentUpdater): Promise<PathRepositoryDocument>;
    afterPersist(document: PathRepositoryDocument): void | Promise<void>;
    now(): ZonedInstant;
    createId(): string;
}

export interface PathCommandPort {
    execute(command: PathUiCommand): Promise<PathCommandExecution>;
}

function matchingReplay(event: PathEvent, command: PathUiCommand): boolean {
    const entityId = command.type === 'create-entity' || command.type === 'start-focus-session' ? command.input.id : command.entityId;
    if (event.entityId !== entityId) return false;
    if (command.type === 'create-entity' || command.type === 'start-focus-session') return event.type === (command.type === 'create-entity' ? 'entity-created' : 'focus-session-started') && JSON.stringify(event.extensions.intent) === JSON.stringify(command.input);
    if (command.type === 'update-entity') return event.type === 'entity-updated' && JSON.stringify(event.extensions.intent) === JSON.stringify(command.patch);
    if (command.type === 'delete-entity') return event.type === 'entity-deleted';
    if (command.type === 'end-focus-session') return event.type === 'focus-session-ended' && JSON.stringify(event.extensions.intent) === JSON.stringify(command.input);
    if (command.type === 'complete') return event.type === 'entity-completed';
    if (command.type === 'reopen') return event.type === 'entity-reopened';
    if (command.type === 'reparent') {
        return event.type === 'entity-reparented'
            && event.nextParentId === command.nextParentId;
    }
    const requested = command.type === 'resize' ? command.patch : command.planned;
    return event.type === 'planned-period-changed'
        && event.extensions.command === command.type
        && (requested.start === undefined || event.nextPlanned?.start === requested.start)
        && (requested.end === undefined || event.nextPlanned?.end === requested.end);
}

function applyCommand(
    document: PathRepositoryDocument,
    command: PathUiCommand,
    dependencies: PathCommandPortDependencies,
): PathCommandResult {
    const commandDependencies = {
        commandId: command.commandId,
        now: dependencies.now,
        createId: dependencies.createId,
    };
    if (command.type === 'create-entity') return createEntity(document.envelope, command.input, commandDependencies);
    if (command.type === 'update-entity') return updateEntity(document.envelope, command.entityId, command.patch, commandDependencies);
    if (command.type === 'delete-entity') return deleteEntity(document.envelope, command.entityId, commandDependencies);
    if (command.type === 'start-focus-session') return startFocusSession(document.envelope, command.input, commandDependencies);
    if (command.type === 'end-focus-session') return endFocusSession(document.envelope, command.entityId, command.input, commandDependencies);
    if (command.type === 'schedule') return schedule(document.envelope, command.entityId, command.planned, commandDependencies);
    if (command.type === 'reschedule') return reschedule(document.envelope, command.entityId, command.planned, commandDependencies);
    if (command.type === 'complete') return complete(document.envelope, command.entityId, commandDependencies);
    if (command.type === 'reopen') return reopen(document.envelope, command.entityId, commandDependencies);
    if (command.type === 'reparent') return reparent(document.envelope, command.entityId, command.nextParentId, commandDependencies);
    return resize(document.envelope, command.entityId, command.patch, commandDependencies);
}

export function createPathCommandPort(dependencies: PathCommandPortDependencies): PathCommandPort {
    return {
        async execute(command: PathUiCommand): Promise<PathCommandExecution> {
            let outcome: PathCommandExecution | undefined;
            let persisted = false;

            const document = await dependencies.updateDocument(current => {
                const prior = current.envelope.events.find(event => event.extensions.commandId === command.commandId);
                if (prior) {
                    outcome = matchingReplay(prior, command)
                        ? {
                            accepted: true,
                            revision: current.envelope.revision,
                            entityId: command.type === 'create-entity' || command.type === 'start-focus-session' ? command.input.id : command.entityId,
                            eventId: prior.id,
                            replayed: true,
                        }
                        : { accepted: false, reason: 'invalid-command' };
                    return undefined;
                }

                const result = applyCommand(current, command, dependencies);
                if (!result.accepted) {
                    outcome = { accepted: false, reason: result.reason };
                    return undefined;
                }

                persisted = true;
                outcome = {
                    accepted: true,
                    // updateDocument owns the persisted revision; this value is
                    // replaced after it returns.
                    revision: current.envelope.revision,
                    entityId: result.entity.id,
                    eventId: result.event.id,
                    replayed: false,
                };
                return { ...current, envelope: result.envelope };
            });

            if (!outcome) throw new Error('Path command transaction did not execute its updater');
            if (!persisted) return outcome;
            if (!outcome.accepted) throw new Error('Persisted path command has no accepted outcome');

            await dependencies.afterPersist(document);
            return { ...outcome, revision: document.envelope.revision };
        },
    };
}
