import { App, Modal, Notice, Setting } from 'obsidian';
import { v4 as uuid } from 'uuid';
import type { DreamGlowsUiContext } from '../../application/ui-context';
import type { PathEntityDraft } from '../../application/path-entity-editor';
import { parentCandidates } from '../../application/parent-candidates';
import { usePathStore } from '../../stores/pathStore';
import type { PathEntity, PathEntityType } from '../../domain/path/model';

type OrdinaryType = Exclude<PathEntityType, 'focus-session'>;
export const entityLabels: Record<OrdinaryType, string> = { dream: 'Rêve', goal: 'Objectif', milestone: 'Jalon', action: 'Action', habit: 'Habitude', evidence: 'Preuve', reflection: 'Réflexion' };

/** Native controls inherit Obsidian's theme, keyboard navigation and modal focus. */
export class EntityModal extends Modal {
    private type: OrdinaryType;
    private draft: PathEntityDraft;
    private busy = false;
    private operationId: string | undefined;
    constructor(app: App, private context: DreamGlowsUiContext, private entity?: PathEntity, type: OrdinaryType = 'dream', parentId?: string) {
        super(app);
        this.type = entity && entity.type !== 'focus-session' ? entity.type : type;
        this.draft = entity ? { id: entity.id, title: entity.title, description: entity.description, why: entity.why, priority: entity.priority, tags: [...entity.tags], planned: entity.planned, parentId: entity.parentId, status: entity.status, extensions: entity.extensions }
            : { id: uuid(), title: '', description: '', why: '', tags: [], parentId, status: 'todo', extensions: {} };
    }
    onOpen() { this.render(); }
    onClose() { this.contentEl.empty(); }
    private render(message = '', error = false) {
        const root = this.contentEl;
        root.empty();
        root.createEl('h2', { text: this.entity ? 'Modifier cet élément' : 'Nouvel élément du parcours' });
        new Setting(root).setName('Type').addDropdown(input => { input.selectEl.setAttribute('aria-label', 'Type'); input.addOptions(entityLabels).setValue(this.type).setDisabled(this.busy || !!this.entity).onChange(value => { this.type = value as OrdinaryType; this.draft.parentId = undefined; this.operationId = undefined; this.render(); }); });
        for (const [key, label] of [['title', 'Titre'], ['why', 'Pourquoi'], ['description', 'Description']] as const) {
            const setting = new Setting(root).setName(label);
            const configure = (input: import('obsidian').TextComponent | import('obsidian').TextAreaComponent) => {
                input.inputEl.setAttribute('aria-label', label);
                input.setValue(this.draft[key] ?? '').setDisabled(this.busy).onChange(value => { this.draft[key] = value; this.operationId = undefined; });
            };
            if (key === 'title') setting.addText(configure); else setting.addTextArea(configure);
        }
        const store = usePathStore(this.context.pinia);
        const candidates = store.document ? parentCandidates(store.document.envelope, this.type, this.draft.id) : [];
        new Setting(root).setName('Parent').addDropdown(input => {
            input.selectEl.setAttribute('aria-label', 'Parent');
            input.addOption('', 'Sans parent');
            for (const candidate of candidates) input.addOption(candidate.id, `${candidate.title} (${candidate.type})`);
            if (this.draft.parentId && !candidates.some(candidate => candidate.id === this.draft.parentId)) input.addOption(this.draft.parentId, 'Parent historique indisponible (conservé)');
            input.setValue(this.draft.parentId ?? '').setDisabled(this.busy).onChange(value => { this.draft.parentId = value || undefined; this.operationId = undefined; });
        });
        if (message) root.createEl('p', { text: message, attr: { role: error ? 'alert' : 'status' } });
        new Setting(root).addButton(button => button.setButtonText('Enregistrer').setCta().setDisabled(this.busy).onClick(() => this.save(false)));
        if (this.entity) new Setting(root).setDesc('Les éléments avec des enfants vivants doivent être déplacés ou archivés depuis les feuilles.').addButton(button => button.setButtonText('Archiver').setWarning().setDisabled(this.busy).onClick(() => this.save(true)));
        new Setting(root).addButton(button => button.setButtonText('Annuler').setDisabled(this.busy).onClick(() => this.close()));
    }
    private async save(archive: boolean) {
        if (this.busy) return;
        this.busy = true;
        const operationId = this.operationId ?? uuid();
        const commandId = `${archive ? 'archive' : 'save'}:${operationId}`;
        this.operationId = operationId;
        this.render('Enregistrement…');
        try {
            const result = archive ? await this.context.entityEditor.archive(this.draft.id, commandId)
                : await this.context.entityEditor.saveEntity(this.type, this.draft, commandId);
            if (!result.accepted && result.reason !== 'no-op') {
                this.operationId = undefined;
                this.busy = false;
                this.render(result.reason === 'has-children' ? 'Déplacez ou archivez d’abord les enfants.' : `Modification refusée : ${result.reason}.`, true);
                return;
            }
            new Notice(archive ? 'Élément archivé.' : 'Élément enregistré.');
            this.close();
        } catch {
            this.busy = false;
            this.render('La sauvegarde a échoué. Votre saisie est conservée ; vous pouvez réessayer.', true);
        }
    }
}
