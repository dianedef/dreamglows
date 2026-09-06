import type { JsonObject, PathEntity } from './model.ts';
import { cloneJsonSafe, decodeCanonical, type PathRepositoryDocument } from './repository.ts';
import { migratePortableFocus } from './portable-focus.ts';

export const PORTABLE_VERSION = 1;
export const PORTABLE_MANIFEST = 'dreamglows-manifest.json';
export const PORTABLE_LIMITS = { files: 10000, bytes: 256 * 1024 * 1024, manifestBytes: 4 * 1024 * 1024 } as const;
export type PortableFiles = Map<string, Uint8Array>;
export interface PortableAttachment { path: string; bytes: Uint8Array }
export interface PortableEntry {
    path: string;
    kind: 'document' | 'object' | 'attachment' | 'readme';
    size: number;
    sha256: string;
    entityId?: string;
    targetPath?: string;
}
export interface PortableManifest { format: 'dreamglows-portable'; version: 1; files: PortableEntry[] }
export interface PortableImport {
    document: PathRepositoryDocument;
    attachments: PortableAttachment[];
    editedEntities: string[];
}
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export const portableText = (value: string): Uint8Array => encoder.encode(value);
export const readPortableText = (value: Uint8Array): string => decoder.decode(value);

/** Reject aliases and platform-sensitive paths before any filesystem call. */
export function assertPortablePath(path: unknown): asserts path is string {
    if (typeof path !== 'string' || !path || path.length > 220 || path !== path.normalize('NFC')
        || /[\\:*?"<>|\u0000-\u001f\u007f%#]/.test(path)
        || path.split('/').some(part => !part || part.startsWith('.') || /[. ]$/.test(part)
            || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part))) {
        throw new Error('Chemin de paquet non sûr ou non portable.');
    }
}

export async function portableHash(bytes: Uint8Array): Promise<string> {
    const hash = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
    return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}

function json(value: unknown): Uint8Array { return portableText(JSON.stringify(value, null, 2) + '\n'); }

function validateIdentities(document: PathRepositoryDocument): void {
    const ids = new Set<string>();
    for (const item of [...document.envelope.entities, ...document.envelope.events]) {
        if (!item.id.trim() || ids.has(item.id)) throw new Error('Identifiant vide ou dupliqué dans le document.');
        ids.add(item.id);
    }
    // Missing historical parents are legal. Ambiguous identities are not.
}

export function validatePortableDocument(input: unknown): PathRepositoryDocument {
    const document = decodeCanonical(input);
    if (!document) throw new Error('Version du document DreamGlows inconnue.');
    validateIdentities(document);
    const migrated = migratePortableFocus(document);
    validateIdentities(migrated);
    return migrated;
}

/** A deliberately small YAML subset: JSON-quoted scalars are valid YAML. */
function markdown(entity: PathEntity): Uint8Array {
    return portableText(`---\ndreamglows: 1\nid: ${JSON.stringify(entity.id)}\ntype: ${JSON.stringify(entity.type)}\ntitle: ${JSON.stringify(entity.title)}\n---\n${entity.description}`);
}

function readMarkdown(bytes: Uint8Array, entity: PathEntity): { title: string; description: string } {
    const text = readPortableText(bytes).replace(/\r\n/g, '\n');
    const match = /^---\ndreamglows: 1\nid: (.+)\ntype: (.+)\ntitle: (.+)\n---\n([\s\S]*)$/.exec(text);
    if (!match) throw new Error('Markdown modifié hors des champs titre et description pris en charge.');
    const id: unknown = JSON.parse(match[1]);
    const type: unknown = JSON.parse(match[2]);
    const title: unknown = JSON.parse(match[3]);
    if (id !== entity.id || type !== entity.type || typeof title !== 'string') throw new Error('Identité Markdown incohérente.');
    return { title, description: match[4] };
}

export async function exportPortablePackage(source: PathRepositoryDocument, attachments: PortableAttachment[] = []): Promise<PortableFiles> {
    const document = validatePortableDocument(source);
    const files: PortableFiles = new Map();
    const entries: PortableEntry[] = [];
    const targets = new Set<string>();
    async function add(entry: Omit<PortableEntry, 'size' | 'sha256'>, bytes: Uint8Array) {
        files.set(entry.path, new Uint8Array(bytes));
        entries.push({ ...entry, size: bytes.byteLength, sha256: await portableHash(bytes) });
    }
    await add({ path: 'document.json', kind: 'document' }, json(document));
    await add({ path: 'README.md', kind: 'readme' }, portableText('# Sauvegarde DreamGlows\n\nCopiez ce dossier entier. Il contient vos données privées et vos paramètres ; ne le publiez pas.\n\nOuvrez les fichiers objects/*.md dans Obsidian pour lire vos objets. Le JSON document.json conserve tous les champs, relations, révisions et événements. Les pièces jointes sont dans attachments/ avec leurs chemins d’origine.\n\nPour restaurer : copiez ce dossier dans le coffre destination, puis lancez « DreamGlows : Restaurer un paquet portable ». Indiquez le chemin du dossier, prévisualisez et confirmez. Une sauvegarde de la destination précède son remplacement. Un fichier existant de contenu différent bloque l’import.\n\nLes titres (chaînes JSON entre guillemets dans le frontmatter YAML) et les descriptions (texte après le frontmatter) peuvent être édités ; cochez alors explicitement l’acceptation de ces modifications à l’import. Les autres champs et les octets des pièces jointes doivent rester intacts. Le manifeste utilise SHA-256 pour détecter les altérations, pas pour authentifier l’expéditeur.\n\nFormat dreamglows-portable v1 ; document repositoryVersion 1 / schemaVersion 1. Aucun compte, abonnement ou service distant n’est nécessaire.\n'));
    for (const entity of document.envelope.entities) {
        const path = `objects/${await portableHash(portableText(entity.id))}.md`;
        await add({ path, kind: 'object', entityId: entity.id }, markdown(entity));
    }
    for (const attachment of attachments) {
        assertPortablePath(attachment.path);
        const key = attachment.path.toLowerCase();
        if (targets.has(key)) throw new Error('Chemin de pièce jointe dupliqué.');
        targets.add(key);
        await add({ path: `attachments/${attachment.path}`, kind: 'attachment', targetPath: attachment.path }, attachment.bytes);
    }
    entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const manifest: PortableManifest = { format: 'dreamglows-portable', version: 1, files: entries };
    files.set(PORTABLE_MANIFEST, json(manifest));
    // Export and import enforce the same limits and integrity contract.
    await importPortablePackage(files);
    return files;
}

/** Read only a bounded, untrusted manifest. Call before opening its referenced files. */
export function parsePortableManifest(bytes: Uint8Array): PortableManifest {
    if (bytes.byteLength > PORTABLE_LIMITS.manifestBytes) throw new Error('Manifeste trop volumineux.');
    const input = JSON.parse(readPortableText(bytes));
    cloneJsonSafe(input);
    if (!input || input.format !== 'dreamglows-portable' || input.version !== PORTABLE_VERSION
        || !Array.isArray(input.files) || input.files.length > PORTABLE_LIMITS.files
        || Object.keys(input).some(key => !['format', 'version', 'files'].includes(key))) {
        throw new Error('Format ou version de paquet DreamGlows non pris en charge.');
    }
    const paths = new Set<string>([PORTABLE_MANIFEST]);
    const targets = new Set<string>();
    const objectIds = new Set<string>();
    let total = 0;
    let documents = 0;
    for (const entry of input.files) {
        if (!entry || typeof entry !== 'object') throw new Error('Entrée de manifeste invalide.');
        assertPortablePath(entry.path);
        const key = entry.path.toLowerCase();
        if (paths.has(key)) throw new Error('Chemin dupliqué dans le manifeste.');
        paths.add(key);
        if (!Number.isSafeInteger(entry.size) || entry.size < 0 || typeof entry.sha256 !== 'string'
            || !/^[a-f0-9]{64}$/.test(entry.sha256)
            || Object.keys(entry).some(key => !['path', 'kind', 'size', 'sha256', 'entityId', 'targetPath'].includes(key))) throw new Error('Intégrité de manifeste invalide.');
        total += entry.size;
        if (total > PORTABLE_LIMITS.bytes) throw new Error('Paquet trop volumineux.');
        if (entry.kind === 'document') {
            if (entry.path !== 'document.json' || entry.entityId !== undefined || entry.targetPath !== undefined) throw new Error('Entrée document invalide.');
            documents++;
        } else if (entry.kind === 'readme') {
            if (entry.path !== 'README.md' || entry.entityId !== undefined || entry.targetPath !== undefined) throw new Error('Entrée documentation invalide.');
        } else if (entry.kind === 'object') {
            if (!/^objects\/[a-f0-9]{64}\.md$/.test(entry.path) || typeof entry.entityId !== 'string' || !entry.entityId
                || objectIds.has(entry.entityId) || entry.targetPath !== undefined) throw new Error('Entrée Markdown invalide.');
            objectIds.add(entry.entityId);
        } else if (entry.kind === 'attachment') {
            assertPortablePath(entry.targetPath);
            if (entry.path !== `attachments/${entry.targetPath}` || entry.entityId !== undefined
                || targets.has(entry.targetPath.toLowerCase())) throw new Error('Entrée pièce jointe invalide.');
            targets.add(entry.targetPath.toLowerCase());
        } else throw new Error('Type de fichier inconnu.');
    }
    if (documents !== 1) throw new Error('Le paquet doit contenir exactement un document.');
    return input as PortableManifest;
}

export async function importPortablePackage(files: PortableFiles, options: { acceptMarkdownEdits?: boolean } = {}): Promise<PortableImport> {
    const manifestBytes = files.get(PORTABLE_MANIFEST);
    if (!manifestBytes) throw new Error('Manifeste DreamGlows absent.');
    const manifest = parsePortableManifest(manifestBytes);
    if (files.size !== manifest.files.length + 1) throw new Error('Fichiers supplémentaires ou manquants dans le paquet.');
    const changed = new Set<string>();
    let total = 0;
    for (const entry of manifest.files) {
        const bytes = files.get(entry.path);
        if (!bytes) throw new Error(`Fichier manquant : ${entry.path}`);
        total += bytes.byteLength;
        if (total > PORTABLE_LIMITS.bytes) throw new Error('Paquet trop volumineux.');
        const matches = bytes.byteLength === entry.size && await portableHash(bytes) === entry.sha256;
        if (!matches) {
            if (entry.kind !== 'object' || !options.acceptMarkdownEdits) throw new Error(`Intégrité incorrecte : ${entry.path}`);
            changed.add(entry.path);
        }
    }
    const raw = decodeCanonical(JSON.parse(readPortableText(files.get('document.json')!)));
    if (!raw) throw new Error('Document DreamGlows invalide.');
    validateIdentities(raw);
    const objects = manifest.files.filter(entry => entry.kind === 'object');
    if (objects.length !== raw.envelope.entities.length) throw new Error('Inventaire Markdown incomplet.');
    const editedEntities: string[] = [];
    for (const entry of objects) {
        const entity = raw.envelope.entities.find(entity => entity.id === entry.entityId);
        if (!entity || entry.path !== `objects/${await portableHash(portableText(entity.id))}.md`) throw new Error('Objet Markdown inconnu.');
        const bytes = files.get(entry.path)!;
        if (!changed.has(entry.path)) {
            if (await portableHash(markdown(entity)) !== entry.sha256) throw new Error('Markdown et document JSON incohérents.');
        } else {
            const edit = readMarkdown(bytes, entity);
            if (edit.title !== entity.title || edit.description !== entity.description) {
                Object.assign(entity, edit);
                editedEntities.push(entity.id);
            }
        }
    }
    return {
        document: validatePortableDocument(raw),
        attachments: manifest.files.filter(entry => entry.kind === 'attachment').map(entry => ({ path: entry.targetPath!, bytes: new Uint8Array(files.get(entry.path)!) })),
        editedEntities,
    };
}
