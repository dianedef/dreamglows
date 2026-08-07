import { Status } from '../types/models';

export const STATUS_EMOJI: Record<Status, string> = {
    'todo': '🔵',
    'in-progress': '🟡',
    'done': '🟢'
};

export const EMOJI_STATUS: Record<string, Status> = {
    '🔵': 'todo',
    '🟡': 'in-progress',
    '🟢': 'done'
};

export const SECTION_ICONS = {
    DREAMGLOWS: '🎯',
    GOALS: '🎯',
    TASKS: '📝',
    METRICS: '📊',
    NOTES: '📝'
}; 