import { defineStore } from 'pinia';
import type { CivilDate, JsonObject, PathEntityType, PathStatus } from '../domain/path/model.ts';
import {
    PATH_TIME_ZONE,
    projectHistory,
    projectJourney,
    projectToday,
    projectWeek,
    type HistoryProjection,
    type JourneyProjection,
    type PathProjectionFilters,
    type TemporalPathProjection,
} from '../domain/path/projections.ts';
import { cloneJsonSafe, type PathRepositoryDocument } from '../domain/path/repository.ts';

export type PathScope = 'today' | 'week' | 'journey' | 'history';

interface PathStoreState {
    document: PathRepositoryDocument | null;
    scope: PathScope;
    referenceDate: CivilDate;
    selectedId?: string;
    filters: PathProjectionFilters;
}

export type ActivePathProjection = TemporalPathProjection | JourneyProjection | HistoryProjection;

const civilPattern = /^\d{4}-\d{2}-\d{2}$/;
const parisFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PATH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

export function civilDateInParis(now: Date = new Date()): CivilDate {
    if (Number.isNaN(now.getTime())) throw new RangeError('A valid instant is required');
    const parts = parisFormatter.formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
    const value = `${part('year')}-${part('month')}-${part('day')}`;
    if (!civilPattern.test(value)) throw new RangeError('Unable to resolve the civil date in Europe/Paris');
    return value as CivilDate;
}

function cloneDocument(document: PathRepositoryDocument): PathRepositoryDocument {
    return cloneJsonSafe(document as unknown as JsonObject) as unknown as PathRepositoryDocument;
}

function cloneFilters(filters: PathProjectionFilters): PathProjectionFilters {
    return {
        ...(filters.statuses ? { statuses: [...filters.statuses] } : {}),
        ...(filters.types ? { types: [...filters.types] } : {}),
        ...(filters.parentId !== undefined ? { parentId: filters.parentId } : {}),
        ...(filters.query !== undefined ? { query: filters.query } : {}),
    };
}

export const usePathStore = defineStore('path', {
    state: (): PathStoreState => ({
        document: null,
        scope: 'today',
        referenceDate: civilDateInParis(),
        filters: {},
    }),

    getters: {
        todayProjection(state): TemporalPathProjection | undefined {
            return state.document
                ? projectToday(state.document.envelope, {
                    referenceDate: state.referenceDate,
                    timeZone: PATH_TIME_ZONE,
                    selectedId: state.selectedId,
                    filters: state.filters,
                })
                : undefined;
        },

        weekProjection(state): TemporalPathProjection | undefined {
            return state.document
                ? projectWeek(state.document.envelope, {
                    referenceDate: state.referenceDate,
                    timeZone: PATH_TIME_ZONE,
                    selectedId: state.selectedId,
                    filters: state.filters,
                })
                : undefined;
        },

        journeyProjection(state): JourneyProjection | undefined {
            return state.document
                ? projectJourney(state.document.envelope, {
                    referenceDate: state.referenceDate,
                    timeZone: PATH_TIME_ZONE,
                    selectedId: state.selectedId,
                    filters: state.filters,
                })
                : undefined;
        },

        historyProjection(state): HistoryProjection | undefined {
            return state.document
                ? projectHistory(state.document.envelope, {
                    referenceDate: state.referenceDate,
                    timeZone: PATH_TIME_ZONE,
                    selectedId: state.selectedId,
                    filters: state.filters,
                })
                : undefined;
        },

        activeProjection(): ActivePathProjection | undefined {
            if (this.scope === 'week') return this.weekProjection;
            if (this.scope === 'journey') return this.journeyProjection;
            if (this.scope === 'history') return this.historyProjection;
            return this.todayProjection;
        },
    },

    actions: {
        hydrate(document: PathRepositoryDocument): void {
            this.document = cloneDocument(document);
        },

        setScope(scope: PathScope): void {
            this.scope = scope;
        },

        setReferenceDate(referenceDate: CivilDate): void {
            this.referenceDate = referenceDate;
        },

        select(selectedId?: string): void {
            this.selectedId = selectedId;
        },

        setFilters(filters: PathProjectionFilters): void {
            this.filters = cloneFilters(filters);
        },

        clearFilters(): void {
            this.filters = {};
        },
    },
});

// Keep useful filter primitives visible to consumers without giving the store a
// persistence dependency.
export type { PathEntityType, PathStatus };
