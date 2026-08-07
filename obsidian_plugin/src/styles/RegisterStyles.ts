import planningStyles from './planning-view.css?inline';
import listViewStyles from './planning/list-view.css?inline';
import weekViewStyles from './planning/week-view.css?inline';
import dailyViewStyles from './daily-view.css?inline';
import goalsViewStyles from './goals/goals-view.css?inline';
import goalsModalStyles from './goals/goals-modal.css?inline';
import taskListStyles from './goals/task-list.css?inline';
import taskModalStyles from './goals/task-modal-content.css?inline';
import dayViewStyles from './day-view.css?inline';
import timeNavStyles from './time-nav.css?inline';
import categoryModalStyles from './goals/category-modal-content.css?inline';
import statsViewStyles from './stats/stats-view.css?inline';
import profileViewStyles from './profile-view.css?inline';
import mainViewStyles from './main-view.css?inline';

export function registerStyles(viewType: string) {
    const styleEl = document.createElement('style');
    styleEl.id = 'dreamglows-styles';
    styleEl.textContent = `
        /* Styles de base */
        ${planningStyles}
        ${goalsViewStyles}
        ${goalsModalStyles}
        ${taskListStyles}
        ${taskModalStyles}
        ${dayViewStyles}
        ${timeNavStyles}
        ${categoryModalStyles}
        ${statsViewStyles}
        ${profileViewStyles}
        ${mainViewStyles}

        /* Styles spécifiques à la vue */
        ${weekViewStyles}
        ${viewType === 'list' ? listViewStyles : ''}
        ${viewType === 'daily' ? dailyViewStyles : ''}
        ${viewType === 'day' ? dayViewStyles : ''}
    `;
    document.head.appendChild(styleEl);
}

export function unregisterStyles() {
    const styleEl = document.getElementById('dreamglows-styles');
    if (styleEl) styleEl.remove();
} 
