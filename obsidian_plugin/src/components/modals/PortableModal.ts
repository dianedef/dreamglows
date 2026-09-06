import { App, Modal, Notice, Setting, type ButtonComponent } from 'obsidian';
import type { PortablePreview, PortableService } from '../../application/portable-service';
import type { PathRepositoryDocument } from '@dreamglows/path-core/repository';

/** Native Obsidian controls own keyboard, focus, theme and text scaling. */
export class PortableModal extends Modal {
    private folder = '';
    private acceptEdits = false;
    private preview: PortablePreview | undefined;
    private busy = false;
    private restoreButton: ButtonComponent | undefined;

    constructor(app: App, private service: PortableService, private afterRestore: (document: PathRepositoryDocument) => Promise<void>) { super(app); }

    onOpen() { this.renderContent(); }
    onClose() { this.contentEl.empty(); }

    private renderContent(message = '', error = false): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Restaurer un paquet DreamGlows' });
        contentEl.createEl('p', { text: 'Copiez le dossier exporté dans ce coffre puis indiquez son chemin. La restauration remplace les données DreamGlows ; une sauvegarde complète sera créée avant le remplacement. Les autres fichiers du coffre sont conservés.' });
        new Setting(contentEl).setName('Dossier du paquet').addText(text => {
            text.inputEl.setAttribute('aria-label', 'Dossier du paquet');
            text.setPlaceholder('DreamGlows-portable/export-…').setValue(this.folder).setDisabled(this.busy)
                .onChange(value => { this.folder = value.trim(); this.preview = undefined; this.restoreButton?.setDisabled(true); });
        });
        new Setting(contentEl).setName('Accepter les titres et descriptions modifiés en Markdown')
            .setDesc('Désactivé : chaque fichier doit être identique à l’export. Activé : les modifications seront comptées avant confirmation.')
            .addToggle(toggle => {
                toggle.toggleEl.setAttribute('aria-label', 'Accepter les titres et descriptions modifiés en Markdown');
                toggle.setValue(this.acceptEdits).setDisabled(this.busy).onChange(value => { this.acceptEdits = value; this.preview = undefined; this.restoreButton?.setDisabled(true); });
            });
        if (message) contentEl.createEl('p', { text: message, attr: { role: error ? 'alert' : 'status', 'aria-live': 'polite' } });
        new Setting(contentEl).addButton(button => button.setButtonText('Prévisualiser').setDisabled(this.busy).onClick(async () => {
            this.busy = true;
            this.renderContent('Validation du paquet…');
            try {
                this.preview = await this.service.preview(this.folder, this.acceptEdits);
                const data = this.preview.data;
                const focus = data.document.envelope.entities.filter(entity => entity.type === 'focus-session').length;
                this.busy = false;
                this.renderContent(`${data.document.envelope.entities.length} objets, dont ${focus} sessions Focus ; ${data.document.envelope.events.length} événements ; ${data.attachments.length} pièces jointes ; ${data.editedEntities.length} objets Markdown modifiés.`);
            } catch (error) {
                this.preview = undefined;
                this.busy = false;
                this.renderContent(error instanceof Error ? error.message : 'Paquet illisible.', true);
            }
        }));
        if (this.preview) new Setting(contentEl).addButton(button => {
            this.restoreButton = button;
            button.setButtonText('Sauvegarder puis restaurer').setWarning().setDisabled(this.busy).onClick(async () => {
            if (!this.preview || this.busy) return;
            const preview = this.preview;
            this.busy = true;
            this.renderContent('Sauvegarde et restauration en cours…');
            try {
                const restored = await this.service.restore(preview);
                await this.afterRestore(restored.document);
                new Notice(`DreamGlows restauré. Sauvegarde : ${restored.backup}`, 12000);
                this.close();
            } catch (error) {
                this.preview = undefined;
                this.busy = false;
                this.renderContent(`${error instanceof Error ? error.message : 'Restauration impossible.'} La sauvegarde éventuelle reste dans DreamGlows-portable.`, true);
            }
            });
        });
        new Setting(contentEl).addButton(button => button.setButtonText('Fermer').setDisabled(this.busy).onClick(() => this.close()));
    }
}
