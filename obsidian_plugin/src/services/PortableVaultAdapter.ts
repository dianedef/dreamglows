import { App, TFile } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';
import type { PathRepositoryDocument } from '@dreamglows/path-core/repository';
import { assertPortablePath, readPortableText, type PortableAttachment } from '@dreamglows/path-core/portable';
import type { PortableVault } from '../application/portable-service';
import { AttachmentInventory } from '../application/attachment-inventory';
import { markdownReferences } from '../application/markdown-references';

const PACKAGE_ROOT = 'DreamGlows-portable';

export class PortableVaultAdapter implements PortableVault {
    constructor(private app: App, private inventory: AttachmentInventory) {}

    async rememberAttachments(document: PathRepositoryDocument, paths: string[]) { await this.inventory.remember(document, paths); }

    async exists(path: string): Promise<boolean> { return this.app.vault.adapter.exists(path); }
    async read(path: string): Promise<Uint8Array> { return new Uint8Array(await this.app.vault.adapter.readBinary(path)); }

    async listFiles(folder: string): Promise<string[]> {
        assertPortablePath(folder);
        const pending = [folder], files: string[] = [];
        while (pending.length) {
            const entries = await this.app.vault.adapter.list(pending.pop()!);
            files.push(...entries.files);
            for (const child of entries.folders) {
                if (!child.startsWith(`${folder}/`)) throw new Error('Dossier de paquet incohérent.');
                assertPortablePath(child);
                pending.push(child);
            }
            if (files.length + pending.length > 10001) throw new Error('Trop de fichiers dans le paquet.');
        }
        return files;
    }

    async writeNew(path: string, bytes: Uint8Array): Promise<void> {
        // The core has validated individual package/attachment paths. The host still
        // rejects hidden paths and traversal for every final composed destination.
        assertPortablePath(path);
        if (await this.exists(path)) throw new Error(`Fichier déjà présent : ${path}`);
        const parts = path.split('/');
        for (let index = 1; index < parts.length; index++) {
            const folder = parts.slice(0, index).join('/');
            if (!await this.exists(folder)) await this.app.vault.createFolder(folder);
        }
        await this.app.vault.createBinary(path, new Uint8Array(bytes).buffer);
    }

    newPackageFolder(kind: 'export' | 'backup'): string {
        return `${PACKAGE_ROOT}/${kind}-${new Date().toISOString().replace(/[:.]/g, '-')}-${uuidv4()}`;
    }

    async collectAttachments(document: PathRepositoryDocument): Promise<PortableAttachment[]> {
        const collected = new Map<string, PortableAttachment>();
        const add = async (link: string, sourcePath = ''): Promise<void> => {
            const target = link.split('|')[0].split('#')[0].trim();
            if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) return;
            const file = this.app.metadataCache.getFirstLinkpathDest(target, sourcePath)
                ?? this.app.vault.getAbstractFileByPath(target);
            if (!(file instanceof TFile)) throw new Error(`Pièce jointe ou note liée introuvable : ${target}`);
            assertPortablePath(file.path);
            if (file.path.toLowerCase().startsWith(`${PACKAGE_ROOT.toLowerCase()}/`)) throw new Error('Un export DreamGlows ne peut pas inclure un autre paquet portable.');
            if (collected.has(file.path)) return;
            const bytes = await this.read(file.path);
            collected.set(file.path, { path: file.path, bytes });
            if (file.extension === 'md') await links(readPortableText(bytes), file.path);
        };
        const links = async (markdown: string, sourcePath = ''): Promise<void> => {
            const references = markdownReferences(markdown);
            for (const link of references.links) await add(decodeURIComponent(link), sourcePath);
            for (const html of references.html) {
                const template = globalThis.document.createElement('template');
                template.innerHTML = html; // Inert fragment, never attached or executed.
                for (const element of template.content.querySelectorAll('[src], [href], [srcset]')) {
                    if (element.hasAttribute('srcset')) throw new Error('Les images HTML srcset ne sont pas prises en charge : utilisez un lien Markdown explicite avant l’export.');
                    for (const attribute of ['src', 'href']) {
                        const path = element.getAttribute(attribute);
                        if (path) await add(decodeURIComponent(path), sourcePath);
                    }
                }
            }
        };
        const declared = document.extensions.attachments;
        for (const path of await this.inventory.paths(document)) await add(path);
        if (declared !== undefined) {
            if (!Array.isArray(declared)) throw new Error('Catalogue de pièces jointes invalide.');
            for (const entry of declared) {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.path !== 'string') throw new Error('Chemin de pièce jointe déclaré invalide.');
                assertPortablePath(entry.path);
                await add(entry.path);
            }
        }
        for (const entity of document.envelope.entities) await links(entity.description);
        return [...collected.values()];
    }
}
