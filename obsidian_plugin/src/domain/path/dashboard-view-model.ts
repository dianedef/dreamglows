import type { CivilDate, PathEntity, PathEnvelope, PathEvent, PathStatus } from './model.ts';
import type { HistoryProjection, TemporalPathProjection } from './projections.ts';
import { isCivilDate, isZonedInstant } from './primitives.ts';

export interface DashboardStatusCounts {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    cancelled: number;
}

export interface DashboardTimelineItem {
    id: string;
    event: PathEvent;
    entity: PathEntity;
}

export interface DashboardViewModel {
    referenceDate: CivilDate;
    todayActions: DashboardStatusCounts & { completionPercent: number | null };
    currentGoals: DashboardStatusCounts;
    currentActions: DashboardStatusCounts;
    activeHighPriority: number;
    timeline: readonly DashboardTimelineItem[];
}

const parisDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function counts(entities: readonly PathEntity[]): DashboardStatusCounts {
    const status = (value: PathStatus) => entities.filter(entity => entity.status === value).length;
    return {
        total: entities.length,
        todo: status('todo'),
        inProgress: status('in-progress'),
        done: status('done'),
        cancelled: status('cancelled'),
    };
}

function civilDateInParis(value: string): CivilDate | undefined {
    if (!isZonedInstant(value)) return undefined;
    const parts = parisDateFormatter.formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
    const date = `${part('year')}-${part('month')}-${part('day')}`;
    return isCivilDate(date) ? date : undefined;
}

/** Derives the dashboard without inventing activity or reading legacy fields. */
export function dashboardViewModel(
    envelope: PathEnvelope,
    today: TemporalPathProjection,
    history: HistoryProjection,
    referenceDate: CivilDate,
): DashboardViewModel {
    if (!isCivilDate(referenceDate)) throw new RangeError(`Invalid dashboard reference date: ${referenceDate}`);
    const todayEntities = today.items.filter(item => item.entity.type === 'action').map(item => item.entity);
    const goals = envelope.entities.filter(entity => entity.type === 'goal');
    const actions = envelope.entities.filter(entity => entity.type === 'action');
    const todayCounts = counts(todayEntities);
    const timeline = history.items
        .filter(item => civilDateInParis(item.event.occurredAt) === referenceDate)
        .map(item => ({ id: item.id, event: item.event, entity: item.entity }))
        .sort((left, right) => {
            const occurred = Date.parse(right.event.occurredAt) - Date.parse(left.event.occurredAt);
            if (occurred !== 0) return occurred;
            const recorded = Date.parse(right.event.recordedAt) - Date.parse(left.event.recordedAt);
            return recorded || right.id.localeCompare(left.id);
        });
    return {
        referenceDate,
        todayActions: {
            ...todayCounts,
            completionPercent: todayCounts.total === 0 ? null : Math.round(todayCounts.done / todayCounts.total * 100),
        },
        currentGoals: counts(goals),
        currentActions: counts(actions),
        activeHighPriority: envelope.entities.filter(entity =>
            (entity.type === 'goal' || entity.type === 'action')
            && entity.priority === 'high'
            && entity.status !== 'done'
            && entity.status !== 'cancelled',
        ).length,
        timeline,
    };
}
