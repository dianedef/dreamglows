export interface DataFiles {
    exists(path: string): Promise<boolean>;
    read(path: string): Promise<string>;
    write(path: string, contents: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    remove(path: string): Promise<void>;
}

/** Two-file recovery protects plugin data across an interrupted replacement. */
export class RecoverableData {
    private files: DataFiles;
    private path: string;
    private recovered: () => void;
    constructor(files: DataFiles, path: string, recovered: () => void) { this.files = files; this.path = path; this.recovered = recovered; }

    async loadData(): Promise<unknown> {
        if (!await this.files.exists(this.path)) {
            if (await this.files.exists(`${this.path}.previous`)) {
                // Validate the backup bytes before restoring, never normalize corruption to empty.
                JSON.parse(await this.files.read(`${this.path}.previous`));
                await this.files.rename(`${this.path}.previous`, this.path);
                this.recovered();
            } else if (await this.files.exists(`${this.path}.pending`)) {
                throw new Error('Écriture DreamGlows interrompue : fichier pending conservé pour récupération.');
            } else return {};
        }
        return JSON.parse(await this.files.read(this.path));
    }

    async saveData(document: unknown): Promise<void> {
        const contents = JSON.stringify(document, null, 2);
        const pending = `${this.path}.pending`, previous = `${this.path}.previous`;
        await this.files.write(pending, contents);
        if (await this.files.read(pending) !== contents) throw new Error('Écriture DreamGlows incomplète.');
        if (await this.files.exists(this.path)) {
            if (await this.files.exists(previous)) await this.files.remove(previous);
            await this.files.rename(this.path, previous);
        }
        try {
            await this.files.rename(pending, this.path);
        } catch (error) {
            if (!await this.files.exists(this.path) && await this.files.exists(previous)) await this.files.rename(previous, this.path);
            throw error;
        }
    }
}
