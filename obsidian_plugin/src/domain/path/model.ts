export const PATH_SCHEMA_VERSION = 1 as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type CivilDate = string & { readonly __civilDate: unique symbol };
export type ZonedInstant = string & { readonly __zonedInstant: unique symbol };
export type PathEntityType =
    | 'dream'
    | 'goal'
    | 'milestone'
    | 'action'
    | 'habit'
    | 'focus-session'
    | 'evidence'
    | 'reflection';
export type PathStatus = 'todo' | 'in-progress' | 'done' | 'cancelled';
export type PathPriority = 'low' | 'medium' | 'high';

export interface PlannedPeriod {
    start?: CivilDate | ZonedInstant;
    end?: CivilDate | ZonedInstant;
}

export interface PathEntity {
    id: string;
    type: PathEntityType;
    title: string;
    description: string;
    status: PathStatus;
    priority?: PathPriority;
    parentId?: string;
    planned?: PlannedPeriod;
    completedAt?: ZonedInstant;
    deletedAt?: ZonedInstant;
    occurredAt?: ZonedInstant;
    createdAt: ZonedInstant;
    updatedAt: ZonedInstant;
    tags: string[];
    extensions: JsonObject;
}

export type PathEventType =
    | 'entity-created'
    | 'planned-period-changed'
    | 'entity-completed'
    | 'entity-reopened'
    | 'entity-reparented'
    | 'entity-updated'
    | 'entity-deleted'
    | 'focus-session-started'
    | 'focus-session-ended'
    | 'evidence-recorded'
    | 'reflection-recorded';

export interface PathEvent {
    id: string;
    type: PathEventType;
    entityId: string;
    occurredAt: ZonedInstant;
    recordedAt: ZonedInstant;
    previousPlanned?: PlannedPeriod;
    nextPlanned?: PlannedPeriod;
    relatedEntityId?: string;
    previousParentId?: string;
    nextParentId?: string;
    previousValues?: JsonObject;
    nextValues?: JsonObject;
    extensions: JsonObject;
}

export interface PathEnvelope {
    schemaVersion: typeof PATH_SCHEMA_VERSION;
    revision: number;
    entities: PathEntity[];
    events: PathEvent[];
    extensions: JsonObject;
}
