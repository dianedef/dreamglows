import type { JsonObject } from './model.ts';
import type { PathRepositoryAdapter } from './repository.ts';

/** Minimal structural contract implemented by an Obsidian Plugin instance. */
export interface ObsidianPluginDataHost {
    loadData(): Promise<unknown>;
    saveData(data: JsonObject): Promise<void>;
}

/**
 * Keeps the domain repository independent from the Obsidian runtime package.
 * Obsidian represents an absent data file as null/undefined; the legacy decoder
 * expects an object, so only that absence is normalized to an empty object.
 */
export class ObsidianPathRepositoryAdapter implements PathRepositoryAdapter {
    private readonly host: ObsidianPluginDataHost;

    constructor(host: ObsidianPluginDataHost) {
        this.host = host;
    }

    async load(): Promise<unknown> {
        const value = await this.host.loadData();
        return value ?? {};
    }

    async save(document: JsonObject): Promise<void> {
        await this.host.saveData(document);
    }
}
