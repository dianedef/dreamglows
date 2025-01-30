import { z } from 'zod';

// Schémas Zod de base
export const MetricsSchema = z.object({
    current: z.number().min(0),
    target: z.number().min(0),
    unit: z.string().min(1)
}).refine(data => data.current <= data.target, {
    message: "La valeur actuelle ne peut pas dépasser la cible"
});

export const StatusSchema = z.enum(['todo', 'in-progress', 'done']);
export const PrioritySchema = z.enum(['low', 'medium', 'high']);

const baseItemFields = {
    id: z.string().uuid(),
    title: z.string().min(1).max(100).trim(),
    description: z.string().default(''),
    status: StatusSchema,
    priority: PrioritySchema,
    tags: z.array(z.string().trim()).default([]),
    startDate: z.string().datetime(),
    dueDate: z.string().datetime()
} as const;

export const BaseItemSchema = z.object(baseItemFields).refine(
    data => new Date(data.startDate) <= new Date(data.dueDate),
    {
        message: "La date de début doit être antérieure ou égale à la date de fin"
    }
);

export const GoalSchema = z.object({
    ...baseItemFields,
    category: z.string().min(1).trim(),
    progress: z.number().min(0).max(100).default(0),
    metrics: MetricsSchema.optional(),
    tasks: z.array(z.string().uuid()).default([]),
    subGoalIds: z.array(z.string().uuid()).default([])
});

export const TaskSchema = z.object({
    ...baseItemFields,
    goalId: z.string().uuid().optional(),
    notes: z.string().default(''),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
}).refine(
    data => new Date(data.updatedAt) >= new Date(data.createdAt),
    {
        message: "La date de mise à jour doit être postérieure ou égale à la date de création"
    }
);

export const DailyMoodSchema = z.object({
    mood: z.number().int().min(1).max(5),
    energyLevel: z.number().int().min(1).max(5),
    notes: z.string().optional(),
    timestamp: z.string().datetime()
});

export const DataStoreSchema = z.object({
    goals: z.array(GoalSchema),
    tasks: z.array(TaskSchema)
});

// Types inférés des schémas Zod
export type Status = z.infer<typeof StatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type BaseItem = z.infer<typeof BaseItemSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type DailyMood = z.infer<typeof DailyMoodSchema>;
export type DataStore = z.infer<typeof DataStoreSchema>;

// Types pour les événements
export const EventTypeSchema = z.enum([
    'goal:created',
    'goal:updated',
    'goal:deleted',
    'task:created',
    'task:updated',
    'task:deleted',
    'mood:updated',
    'data:synced',
    'stats:updated'
]);

export const EventSchema = z.object({
    type: EventTypeSchema,
    payload: z.unknown(),
    timestamp: z.string().datetime()
});

export type EventType = z.infer<typeof EventTypeSchema>;
export type Event<T = unknown> = Omit<z.infer<typeof EventSchema>, 'payload'> & { payload: T };

// Types pour les statistiques
export const DayStatsSchema = z.object({
    mood: z.number().int().min(1).max(5).optional(),
    energyLevel: z.number().int().min(1).max(5).optional(),
    completionRate: z.number().min(0).max(100).optional(),
    completedTasks: z.number().int().min(0)
});

export const CategoryStatsSchema = z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    todo: z.number().int().min(0),
    completionRate: z.number().min(0).max(100)
}).refine(
    data => data.completed + data.inProgress + data.todo === data.total,
    {
        message: "La somme des statuts doit être égale au total"
    }
);

export const PeriodStatsSchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    goals: CategoryStatsSchema,
    tasks: z.object({
        total: z.number().int().min(0),
        completed: z.number().int().min(0),
        completionRate: z.number().min(0).max(100),
        dailyAverage: z.number().min(0)
    }),
    categories: z.record(z.string(), CategoryStatsSchema),
    dailyStats: z.record(z.string(), DayStatsSchema)
}).refine(
    data => new Date(data.startDate) <= new Date(data.endDate),
    {
        message: "La date de début doit être antérieure ou égale à la date de fin"
    }
);

export type DayStats = z.infer<typeof DayStatsSchema>;
export type CategoryStats = z.infer<typeof CategoryStatsSchema>;
export type PeriodStats = z.infer<typeof PeriodStatsSchema>; 