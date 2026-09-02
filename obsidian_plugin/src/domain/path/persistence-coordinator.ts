import type { JsonObject } from './model.ts';
import {
    cloneJsonSafe,
    PathRepository,
    type PathRepositoryDocument,
    type PathRepositoryLoadResult,
} from './repository.ts';

export type PathDocumentUpdate = (
    current: PathRepositoryDocument,
) => PathRepositoryDocument | undefined | Promise<PathRepositoryDocument | undefined>;

function cloneDocument(document: PathRepositoryDocument): PathRepositoryDocument {
    return cloneJsonSafe(document as unknown as JsonObject) as unknown as PathRepositoryDocument;
}

/**
 * Single in-memory owner for a loaded repository document.
 *
 * Updates are functions rather than pre-built documents: each function runs
 * against the latest successfully persisted revision, preventing queued callers
 * from accidentally saving the same stale revision or discarding one another.
 */
export class PathPersistenceCoordinator {
    private readonly repository: PathRepository;
    private loadPromise: Promise<PathRepositoryLoadResult> | undefined;
    private currentDocument: PathRepositoryDocument | undefined;
    private updateTail: Promise<void> = Promise.resolve();

    constructor(repository: PathRepository) {
        this.repository = repository;
    }

    load(): Promise<PathRepositoryLoadResult> {
        if (!this.loadPromise) {
            this.loadPromise = this.repository.load().then(result => {
                this.currentDocument = cloneDocument(result.document);
                return {
                    ...result,
                    document: cloneDocument(result.document),
                };
            });
        }
        return this.loadPromise.then(result => ({
            ...result,
            document: cloneDocument(result.document),
        }));
    }

    get document(): PathRepositoryDocument | undefined {
        return this.currentDocument ? cloneDocument(this.currentDocument) : undefined;
    }

    update(buildNext: PathDocumentUpdate): Promise<PathRepositoryDocument> {
        const operation = this.updateTail.then(async () => {
            await this.load();
            if (!this.currentDocument) throw new Error('Chemin repository has not been loaded');

            const base = cloneDocument(this.currentDocument);
            const candidate = await buildNext(base);
            if (candidate === undefined) return cloneDocument(this.currentDocument);
            const saved = await this.repository.save(candidate, this.currentDocument.envelope.revision);
            this.currentDocument = cloneDocument(saved);
            return cloneDocument(saved);
        });

        // A failed update must not poison later updates. The current document is
        // only advanced after a successful repository write.
        this.updateTail = operation.then(() => undefined, () => undefined);
        return operation;
    }
}
