import type {
    CivilDate,
    PathEntity,
    PathEntityType,
    PathEnvelope,
    PathEvent,
    PathStatus,
} from './model.ts';
import { isCivilDate, isZonedInstant } from './primitives.ts';

export const PATH_TIME_ZONE = 'Europe/Paris' as const;

export interface PathProjectionFilters {
    statuses?: readonly PathStatus[];
    types?: readonly PathEntityType[];
    parentId?: string | null;
    query?: string;
}

export interface PathProjectionOptions {
    referenceDate: CivilDate;
    timeZone: typeof PATH_TIME_ZONE;
    selectedId?: string;
    filters?: PathProjectionFilters;
}

export interface CivilDateRange {
    start: CivilDate;
    end: CivilDate;
}

export interface TemporalProjectionItem {
    id: string;
    entity: PathEntity;
    start: CivilDate;
    end: CivilDate;
}

export interface PathProjectionBase {
    range: CivilDateRange;
    entities: readonly PathEntity[];
    unscheduled: readonly PathEntity[];
    invalidTemporal: readonly PathEntity[];
    selected?: PathEntity;
    selectionVisibility?: 'visible' | 'filtered' | 'outside-range' | 'unscheduled' | 'invalid-temporal' | 'missing';
}

export interface TemporalPathProjection extends PathProjectionBase {
    items: readonly TemporalProjectionItem[];
}

export interface JourneyNode {
    id: string;
    entity: PathEntity;
    children: readonly JourneyNode[];
    contextOnly?: boolean;
}

export interface JourneyProjection extends PathProjectionBase {
    roots: readonly JourneyNode[];
}

export interface HistoryItem {
    id: string;
    event: PathEvent;
    entity: PathEntity;
}

export interface HistoryProjection extends PathProjectionBase {
    items: readonly HistoryItem[];
}

const civilPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const parisDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PATH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function assertOptions(options: PathProjectionOptions): void {
    if (options.timeZone !== PATH_TIME_ZONE) {
        throw new RangeError(`Chemin projections require ${PATH_TIME_ZONE}`);
    }
    parseCivilDate(options.referenceDate);
}

function parseCivilDate(value: string): Date {
    const match = civilPattern.exec(value);
    if (!match) throw new RangeError(`Invalid civil date: ${value}`);
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (formatUtcDate(date) !== value) throw new RangeError(`Invalid civil date: ${value}`);
    return date;
}

function formatUtcDate(date: Date): CivilDate {
    return date.toISOString().slice(0, 10) as CivilDate;
}

function addCivilDays(value: CivilDate, days: number): CivilDate {
    const date = parseCivilDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return formatUtcDate(date);
}

function localCivilDate(value: string): CivilDate | undefined {
    if (civilPattern.test(value)) {
        try {
            parseCivilDate(value);
            return value as CivilDate;
        } catch {
            return undefined;
        }
    }
    if (!isZonedInstant(value)) return undefined;
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime())) return undefined;
    const parts = parisDateFormatter.formatToParts(instant);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
    const year = part('year');
    const month = part('month');
    const day = part('day');
    return year && month && day ? `${year}-${month}-${day}` as CivilDate : undefined;
}

function entityRange(entity: PathEntity): CivilDateRange | undefined {
    const rawStart = entity.planned?.start;
    const rawEnd = entity.planned?.end;
    const start = rawStart ? localCivilDate(rawStart) : rawEnd ? localCivilDate(rawEnd) : undefined;
    const end = rawEnd ? localCivilDate(rawEnd) : rawStart ? localCivilDate(rawStart) : undefined;
    if (!start || !end) return undefined;
    if (rawStart && rawEnd) {
        const sameKind = isCivilDate(rawStart) === isCivilDate(rawEnd);
        if (!sameKind) return undefined;
        const inverted = isCivilDate(rawStart)
            ? rawStart > rawEnd
            : !isZonedInstant(rawStart) || !isZonedInstant(rawEnd) || Date.parse(rawStart) > Date.parse(rawEnd);
        if (inverted) return undefined;
    }
    return { start, end };
}

const schedulable = new Set<PathEntityType>(['goal', 'milestone', 'action', 'habit']);
const hasPlannedValue = (entity: PathEntity): boolean => entity.planned?.start !== undefined || entity.planned?.end !== undefined;
const isUnscheduled = (entity: PathEntity): boolean => schedulable.has(entity.type) && !hasPlannedValue(entity);
const hasInvalidTemporal = (entity: PathEntity): boolean => hasPlannedValue(entity) && entityRange(entity) === undefined;

function overlaps(left: CivilDateRange, right: CivilDateRange): boolean {
    return left.start <= right.end && left.end >= right.start;
}

function weekRange(referenceDate: CivilDate): CivilDateRange {
    const day = parseCivilDate(referenceDate).getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addCivilDays(referenceDate, mondayOffset);
    return { start, end: addCivilDays(start, 6) };
}

function matches(entity: PathEntity, filters: PathProjectionFilters | undefined): boolean {
    if (!filters) return true;
    if (filters.statuses && !filters.statuses.includes(entity.status)) return false;
    if (filters.types && !filters.types.includes(entity.type)) return false;
    if (filters.parentId !== undefined && entity.parentId !== (filters.parentId ?? undefined)) return false;
    const query = filters.query?.trim().toLocaleLowerCase('fr-FR');
    if (query) {
        const haystack = `${entity.title}\n${entity.description}\n${entity.tags.join('\n')}`.toLocaleLowerCase('fr-FR');
        if (!haystack.includes(query)) return false;
    }
    return true;
}

function base(envelope: PathEnvelope, options: PathProjectionOptions, range: CivilDateRange): PathProjectionBase {
    assertOptions(options);
    const entities = envelope.entities.filter(entity => matches(entity, options.filters));
    const unscheduled = entities.filter(isUnscheduled);
    const invalidTemporal = entities.filter(hasInvalidTemporal);
    const selected = options.selectedId ? envelope.entities.find(entity => entity.id === options.selectedId) : undefined;
    let selectionVisibility: PathProjectionBase['selectionVisibility'];
    if (options.selectedId) {
        if (!selected) selectionVisibility = 'missing';
        else if (!matches(selected, options.filters)) selectionVisibility = 'filtered';
        else if (hasInvalidTemporal(selected)) selectionVisibility = 'invalid-temporal';
        else if (isUnscheduled(selected)) selectionVisibility = 'unscheduled';
        else if (!entityRange(selected) || !overlaps(entityRange(selected)!, range)) selectionVisibility = 'outside-range';
        else selectionVisibility = 'visible';
    }
    return { range, entities, unscheduled, invalidTemporal, ...(selected ? { selected } : {}), ...(selectionVisibility ? { selectionVisibility } : {}) };
}

function temporal(envelope: PathEnvelope, options: PathProjectionOptions, range: CivilDateRange): TemporalPathProjection {
    const shared = base(envelope, options, range);
    const items = shared.entities.flatMap(entity => {
        const planned = entityRange(entity);
        return planned && overlaps(planned, range)
            ? [{ id: entity.id, entity, start: planned.start, end: planned.end }]
            : [];
    });
    return { ...shared, items };
}

export function projectToday(envelope: PathEnvelope, options: PathProjectionOptions): TemporalPathProjection {
    return temporal(envelope, options, { start: options.referenceDate, end: options.referenceDate });
}

export function projectWeek(envelope: PathEnvelope, options: PathProjectionOptions): TemporalPathProjection {
    assertOptions(options);
    return temporal(envelope, options, weekRange(options.referenceDate));
}

export function projectJourney(envelope: PathEnvelope, options: PathProjectionOptions): JourneyProjection {
    const range = weekRange(options.referenceDate);
    const filtered = base(envelope, options, range);
    const byId = new Map(envelope.entities.map(entity => [entity.id, entity]));
    const included = new Set(filtered.entities.map(entity => entity.id));
    for (const entity of filtered.entities) {
        const visited = new Set<string>();
        let parentId = entity.parentId;
        while (parentId && !visited.has(parentId)) {
            visited.add(parentId);
            const parent = byId.get(parentId);
            if (!parent) break;
            included.add(parent.id);
            parentId = parent.parentId;
        }
    }
    const journeyEntities = envelope.entities.filter(entity => included.has(entity.id));
    const children = new Map<string, PathEntity[]>();
    for (const entity of journeyEntities) {
        if (!entity.parentId || !included.has(entity.parentId)) continue;
        const siblings = children.get(entity.parentId) ?? [];
        siblings.push(entity);
        children.set(entity.parentId, siblings);
    }
    const visiting = new Set<string>();
    const emitted = new Set<string>();
    const node = (entity: PathEntity): JourneyNode => {
        if (visiting.has(entity.id)) return { id: entity.id, entity, children: [], ...(matches(entity, options.filters) ? {} : { contextOnly: true }) };
        emitted.add(entity.id);
        visiting.add(entity.id);
        const nested = (children.get(entity.id) ?? []).map(node);
        visiting.delete(entity.id);
        return { id: entity.id, entity, children: nested, ...(matches(entity, options.filters) ? {} : { contextOnly: true }) };
    };
    const roots = journeyEntities
        .filter(entity => !entity.parentId || !included.has(entity.parentId))
        .map(node);
    // Malformed legacy cycles have no natural root. Keep them visible as a
    // bounded tree instead of silently dropping the whole connected component.
    for (const entity of journeyEntities) if (!emitted.has(entity.id)) roots.push(node(entity));
    return { ...filtered, roots };
}

export function projectHistory(envelope: PathEnvelope, options: PathProjectionOptions): HistoryProjection {
    const range = weekRange(options.referenceDate);
    const shared = base(envelope, options, range);
    const entities = new Map(shared.entities.map(entity => [entity.id, entity]));
    const items = envelope.events.flatMap(event => {
        const entity = entities.get(event.entityId);
        const occurred = localCivilDate(event.occurredAt);
        return entity && occurred && occurred >= range.start && occurred <= range.end
            ? [{ id: event.id, event, entity }]
            : [];
    }).sort((left, right) => {
        const occurred = Date.parse(left.event.occurredAt) - Date.parse(right.event.occurredAt);
        if (occurred !== 0) return occurred;
        const recorded = Date.parse(left.event.recordedAt) - Date.parse(right.event.recordedAt);
        return recorded || left.id.localeCompare(right.id);
    });
    return { ...shared, items };
}
