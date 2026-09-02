import type { CivilDate, PathEntity, PathEnvelope, PathStatus } from './model.ts';
import { isCivilDate, isZonedInstant } from './primitives.ts';

export interface PathStatisticsRange {
    start: CivilDate;
    endInclusive: CivilDate;
}

export interface PathDailyStatistics {
    date: CivilDate;
    created: number;
    completed: number;
    reopened: number;
    evidence: number;
    reflection: number;
}

export interface PathStatusStatistics {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    cancelled: number;
    completionPercent: number | null;
}

export interface PathHierarchyStatistics {
    maxDepth: number;
    cyclicEntities: number;
    orphanEntities: number;
}

export interface PathStatistics {
    range: PathStatisticsRange;
    daily: readonly PathDailyStatistics[];
    totals: Omit<PathDailyStatistics, 'date'>;
    currentGoals: PathStatusStatistics;
    currentActions: PathStatusStatistics;
    hierarchy: PathHierarchyStatistics;
}

const parisFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
});

function parseCivil(value: CivilDate): Date {
    if (!isCivilDate(value)) throw new RangeError(`Invalid civil date: ${value}`);
    return new Date(`${value}T00:00:00.000Z`);
}

function dates(range: PathStatisticsRange): CivilDate[] {
    const start = parseCivil(range.start);
    const end = parseCivil(range.endInclusive);
    if (start > end) throw new RangeError('Statistics range start must not follow endInclusive');
    const result: CivilDate[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        result.push(cursor.toISOString().slice(0, 10) as CivilDate);
    }
    return result;
}

function parisCivil(value: string): CivilDate | undefined {
    if (!isZonedInstant(value)) return undefined;
    const parts = parisFormatter.formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
    const result = `${part('year')}-${part('month')}-${part('day')}`;
    return isCivilDate(result) ? result : undefined;
}

function statuses(entities: readonly PathEntity[]): PathStatusStatistics {
    const count = (status: PathStatus) => entities.filter(entity => entity.status === status).length;
    const done = count('done');
    return {
        total: entities.length,
        todo: count('todo'),
        inProgress: count('in-progress'),
        done,
        cancelled: count('cancelled'),
        completionPercent: entities.length ? Math.round(done / entities.length * 100) : null,
    };
}

function hierarchy(entities: readonly PathEntity[]): PathHierarchyStatistics {
    const byId = new Map(entities.map(entity => [entity.id, entity]));
    let maxDepth = 0;
    let cyclicEntities = 0;
    let orphanEntities = 0;
    for (const origin of entities) {
        let current: PathEntity | undefined = origin;
        let depth = 0;
        const seen = new Set<string>();
        let cyclic = false;
        let orphan = false;
        while (current?.parentId && depth <= entities.length) {
            if (seen.has(current.id)) { cyclic = true; break; }
            seen.add(current.id);
            const parent = byId.get(current.parentId);
            if (!parent) { orphan = true; break; }
            depth += 1;
            current = parent;
        }
        if (depth > entities.length) cyclic = true;
        if (cyclic) cyclicEntities += 1;
        if (orphan) orphanEntities += 1;
        maxDepth = Math.max(maxDepth, Math.min(depth, entities.length));
    }
    return { maxDepth, cyclicEntities, orphanEntities };
}

export function computePathStatistics(envelope: PathEnvelope, range: PathStatisticsRange): PathStatistics {
    const daily = dates(range).map(date => ({ date, created: 0, completed: 0, reopened: 0, evidence: 0, reflection: 0 }));
    const byDate = new Map(daily.map(day => [day.date, day]));
    for (const event of envelope.events) {
        const day = byDate.get(parisCivil(event.occurredAt) as CivilDate);
        if (!day) continue;
        if (event.type === 'entity-created') day.created += 1;
        if (event.type === 'entity-completed') day.completed += 1;
        if (event.type === 'entity-reopened') day.reopened += 1;
        if (event.type === 'evidence-recorded') day.evidence += 1;
        if (event.type === 'reflection-recorded') day.reflection += 1;
    }
    const totals = daily.reduce((sum, day) => ({
        created: sum.created + day.created,
        completed: sum.completed + day.completed,
        reopened: sum.reopened + day.reopened,
        evidence: sum.evidence + day.evidence,
        reflection: sum.reflection + day.reflection,
    }), { created: 0, completed: 0, reopened: 0, evidence: 0, reflection: 0 });
    return {
        range: { ...range }, daily, totals,
        currentGoals: statuses(envelope.entities.filter(entity => entity.type === 'goal')),
        currentActions: statuses(envelope.entities.filter(entity => entity.type === 'action')),
        hierarchy: hierarchy(envelope.entities),
    };
}
