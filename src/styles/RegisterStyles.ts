import planningStyles from './planning-view.css';
import listViewStyles from './planning/list-view.css';
import weekViewStyles from './planning/week-view.css';

export function registerStyles(viewType: string) {
    const styleEl = document.createElement('style');
    styleEl.id = 'goalflowz-styles';
    styleEl.textContent = `
        .goalflowz-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        
        .goalflowz-view-switch {
            display: flex;
            gap: 8px;
            padding: 8px;
            background: var(--background-secondary);
        }
        
        .goalflowz-view-switch button {
            padding: 6px 12px;
            border-radius: 4px;
            border: none;
            background: var(--background-modifier-border);
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .goalflowz-view-switch button.active {
            background: var(--interactive-accent);
            color: var(--text-on-accent);
        }
        ${viewType === 'list' ? listViewStyles : weekViewStyles}

        ${planningStyles}
    `;
    document.head.appendChild(styleEl);
}

export function unregisterStyles() {
    const styleEl = document.getElementById('goalflowz-styles');
    if (styleEl) styleEl.remove();
} 