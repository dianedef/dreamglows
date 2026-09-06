import { PathPersistenceCoordinator } from '@dreamglows/path-core/persistence-coordinator';
import type { PathRepositoryDocument } from '@dreamglows/path-core/repository';
import {
    assertPortablePath, exportPortablePackage, importPortablePackage, parsePortableManifest,
    portableHash, portableText, PORTABLE_LIMITS, PORTABLE_MANIFEST,
    type PortableAttachment, type PortableFiles, type PortableImport,
} from '@dreamglows/path-core/portable';

export interface PortableVault {
    read(path: string): Promise<Uint8Array>;
    exists(path: string): Promise<boolean>;
    listFiles(folder: string): Promise<string[]>;
    writeNew(path: string, bytes: Uint8Array): Promise<void>;
    collectAttachments(document: PathRepositoryDocument): Promise<PortableAttachment[]>;
    rememberAttachments(document: PathRepositoryDocument, paths: string[]): Promise<void>;
    newPackageFolder(kind: 'export' | 'backup'): string;
}
export interface PortablePreview {
    folder: string;
    fingerprint: string;
    destinationFingerprint: string;
    acceptMarkdownEdits: boolean;
    data: PortableImport;
}

async function fingerprint(document: PathRepositoryDocument): Promise<string> {
    return portableHash(portableText(JSON.stringify(document)));
}

/** File IO is host-owned; all document operations share the command writer queue. */
export class PortableService {
    private coordinator: PathPersistenceCoordinator;
    private vault: PortableVault;
    constructor(coordinator: PathPersistenceCoordinator, vault: PortableVault) { this.coordinator = coordinator; this.vault = vault; }

    private async readPackage(folder: string): Promise<PortableFiles> {
        assertPortablePath(folder);
        const manifestBytes = await this.vault.read(`${folder}/${PORTABLE_MANIFEST}`);
        const manifest = parsePortableManifest(manifestBytes);
        const declared = new Set([`${folder}/${PORTABLE_MANIFEST}`, ...manifest.files.map(entry => `${folder}/${entry.path}`)]);
        const actual = await this.vault.listFiles(folder);
        if (actual.length !== declared.size || actual.some(path => !declared.has(path))) throw new Error('Le dossier contient des fichiers manquants ou non déclarés dans le manifeste.');
        const files: PortableFiles = new Map([[PORTABLE_MANIFEST, manifestBytes]]);
        let total = 0;
        for (const entry of manifest.files) {
            const bytes = await this.vault.read(`${folder}/${entry.path}`);
            total += bytes.byteLength;
            if (total > PORTABLE_LIMITS.bytes) throw new Error('Paquet trop volumineux.');
            files.set(entry.path, bytes);
        }
        return files;
    }

    private async writePackage(folder: string, files: PortableFiles): Promise<void> {
        assertPortablePath(folder);
        if (await this.vault.exists(folder)) throw new Error('Dossier de paquet déjà présent.');
        // Publish the manifest last: partial exports cannot be selected as valid packages.
        for (const [path, bytes] of files) if (path !== PORTABLE_MANIFEST) await this.vault.writeNew(`${folder}/${path}`, bytes);
        await this.vault.writeNew(`${folder}/${PORTABLE_MANIFEST}`, files.get(PORTABLE_MANIFEST)!);
        await importPortablePackage(await this.readPackage(folder));
    }

    async export(): Promise<string> {
        const folder = this.vault.newPackageFolder('export');
        await this.coordinator.update(async current => {
            const files = await exportPortablePackage(current, await this.vault.collectAttachments(current));
            await this.writePackage(folder, files);
            return undefined;
        });
        return folder;
    }

    async preview(folder: string, acceptMarkdownEdits = false): Promise<PortablePreview> {
        const files = await this.readPackage(folder);
        const data = await importPortablePackage(files, { acceptMarkdownEdits });
        let destinationFingerprint = '';
        await this.coordinator.update(async current => { destinationFingerprint = await fingerprint(current); });
        return { folder, fingerprint: await this.packageFingerprint(files), destinationFingerprint, acceptMarkdownEdits, data };
    }

    private async packageFingerprint(files: PortableFiles): Promise<string> {
        const hashes: string[] = [];
        for (const [path, bytes] of [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) hashes.push(`${path}:${await portableHash(bytes)}`);
        return portableHash(portableText(hashes.join('\n')));
    }

    async restore(preview: PortablePreview): Promise<{ backup: string; document: PathRepositoryDocument }> {
        let backup = '';
        const document = await this.coordinator.restore(async current => {
            if (await fingerprint(current) !== preview.destinationFingerprint) throw new Error('Les données ont changé depuis la prévisualisation. Prévisualisez à nouveau.');
            const files = await this.readPackage(preview.folder);
            if (await this.packageFingerprint(files) !== preview.fingerprint) throw new Error('Le paquet a changé depuis la prévisualisation.');
            const imported = await importPortablePackage(files, { acceptMarkdownEdits: preview.acceptMarkdownEdits });
            const currentAttachments = await this.vault.collectAttachments(current);
            const inventoryKey = (attachments: PortableAttachment[]) => JSON.stringify(attachments.map(attachment => attachment.path).sort());
            if (await fingerprint(current) === await fingerprint(imported.document)
                && inventoryKey(currentAttachments) !== inventoryKey(imported.attachments)) {
                throw new Error('Le même document possède un inventaire de pièces jointes différent. Restaurez ce paquet dans un coffre vide.');
            }
            const missing: PortableAttachment[] = [];
            // Validate every destination before creating the backup or any attachment.
            for (const attachment of imported.attachments) {
                if (await this.vault.exists(attachment.path)) {
                    if (await portableHash(await this.vault.read(attachment.path)) !== await portableHash(attachment.bytes)) throw new Error(`Pièce jointe déjà présente avec un contenu différent : ${attachment.path}`);
                } else missing.push(attachment);
            }
            backup = this.vault.newPackageFolder('backup');
            await this.writePackage(backup, await exportPortablePackage(current, currentAttachments));
            // Existing files are never replaced. An interrupted import may leave only new,
            // unreferenced files; retry accepts identical bytes and the backup stays usable.
            for (const attachment of missing) await this.vault.writeNew(attachment.path, attachment.bytes);
            for (const attachment of imported.attachments) {
                if (await portableHash(await this.vault.read(attachment.path)) !== await portableHash(attachment.bytes)) throw new Error('Une pièce jointe a changé pendant la restauration.');
            }
            await this.vault.rememberAttachments(imported.document, imported.attachments.map(attachment => attachment.path));
            return imported.document;
        });
        return { backup, document };
    }
}
