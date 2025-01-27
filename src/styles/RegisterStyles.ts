import planningStyles from './planning-view.css';
import listViewStyles from './planning/list-view.css';
import weekViewStyles from './planning/week-view.css';
import dailyViewStyles from './daily-view.css';
import goalsViewStyles from './goals/goals-view.css';
import goalsModalStyles from './goals/goals-modal.css';
import taskListStyles from './goals/task-list.css';
import taskModalStyles from './goals/task-modal-content.css';
import dayViewStyles from './day-view.css';
import categoryModalStyles from './goals/category-modal-content.css';
import statsViewStyles from './stats/stats-view.css';

export function registerStyles(viewType: string) {
    const styleEl = document.createElement('style');
    styleEl.id = 'goalflowz-styles';
    styleEl.textContent = `
        /* Styles de base */    
        ${planningStyles}
        ${goalsViewStyles}
        ${goalsModalStyles}
        ${taskListStyles}
        ${taskModalStyles}
        ${dayViewStyles}
        ${categoryModalStyles}
        ${statsViewStyles}

        /* Styles spécifiques à la vue */
        ${weekViewStyles}
        ${viewType === 'list' ? listViewStyles : ''}
        ${viewType === 'daily' ? dailyViewStyles : ''}
        ${viewType === 'day' ? dayViewStyles : ''}
    `;
    document.head.appendChild(styleEl);
}

export function unregisterStyles() {
    const styleEl = document.getElementById('goalflowz-styles');
    if (styleEl) styleEl.remove();
} 