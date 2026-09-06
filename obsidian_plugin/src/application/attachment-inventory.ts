import { portableHash, portableText, assertPortablePath } from '@dreamglows/path-core/portable';
import { RecoverableData } from './recoverable-data.ts';

/** Snapshot-keyed metadata never changes the portable document or its revision.
 * A failed document commit simply leaves an unused inventory entry. */
export class AttachmentInventory {
    private storage: RecoverableData;
    constructor(storage: RecoverableData) { this.storage = storage; }
    private async key(document: unknown) { return portableHash(portableText(JSON.stringify(document))); }
    private async entries(): Promise<Record<string, string[]>> {
        const value = await this.storage.loadData();
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Inventaire de pièces jointes illisible.');
        for (const [key, paths] of Object.entries(value)) {
            if (!/^[a-f0-9]{64}$/.test(key) || !Array.isArray(paths)) throw new Error('Inventaire de pièces jointes invalide.');
            for (const path of paths) assertPortablePath(path);
        }
        return value as Record<string, string[]>;
    }
    async paths(document: unknown): Promise<string[]> { return (await this.entries())[await this.key(document)] ?? []; }
    async remember(document: unknown, paths: string[]): Promise<void> {
        for (const path of paths) assertPortablePath(path);
        const entries = await this.entries(), key = await this.key(document);
        delete entries[key];
        entries[key] = [...paths];
        // Do not evict the inventory of a still-active/recoverable snapshot after
        // repeated failed imports. These path-only records contain no file bytes.
        await this.storage.saveData(entries);
    }
    async carry(previous: unknown, next: unknown): Promise<void> {
        const entries = await this.entries(), nextKey = await this.key(next);
        if (entries[nextKey] !== undefined) return;
        const inherited = entries[await this.key(previous)];
        if (inherited) await this.remember(next, inherited);
    }
}
