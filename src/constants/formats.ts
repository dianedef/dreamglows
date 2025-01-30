export const DATE_FORMAT = {
    FILE: 'yyyy-MM-dd',
    DISPLAY: 'dd MMMM yyyy',
    ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
};

export const DELIMITERS = {
    SECTION: '##',
    SUBSECTION: '###',
    ITEM: '|',
    TAG: '#',
    TASK_REF: '#task-',
    GOAL_REF: '#goal-'
};

export const SECTIONS = {
    FR: {
        GOALS: '🎯 Objectifs atteints',
        DIARY: '📝 Journal',
        REVIEW: '📊 Bilan de la journée'
    },
    EN: {
        GOALS: '🎯 Goals Achieved',
        DIARY: '📝 Diary',
        REVIEW: '📊 Daily Review'
    }
};

// Nombre minimum de champs attendus dans le format
export const MIN_FIELDS = {
    GOAL: 10,
    TASK: 8
};

// Index des champs dans le format
export const FIELD_INDEX = {
    TITLE_AND_STATUS: 0,
    ID: 1,
    CATEGORY_OR_GOAL_ID: 2,
    PRIORITY: 3,
    START_DATE: 4,
    DUE_DATE: 5,
    PROGRESS_OR_DESCRIPTION: 6,
    DESCRIPTION_OR_NOTES: 7,
    METRICS_OR_TAGS: 8,
    TASKS: 9,
    TAGS: 10
}; 