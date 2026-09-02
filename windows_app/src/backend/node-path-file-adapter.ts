import { constants } from 'node:fs';
import { access, copyFile, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type { JsonObject } from '@dreamglows/path-core/model';
import type { PathRepositoryAdapter } from '@dreamglows/path-core/repository';

export type WindowsPathLoadSource = 'primary' | 'backup' | 'empty';

export interface WindowsPathRecoveryState {
  source: WindowsPathLoadSource;
  primaryPath: string;
  backupPath: string;
}

export class WindowsPathFileReadError extends Error {
  readonly primaryPath: string;
  readonly backupAvailable: boolean;

  constructor(primaryPath: string, backupAvailable: boolean, options?: ErrorOptions) {
    super(`Unable to read the local Chemin document at ${primaryPath}`, options);
    this.name = 'WindowsPathFileReadError';
    this.primaryPath = primaryPath;
    this.backupAvailable = backupAvailable;
  }
}

export class WindowsPathFileWriteError extends Error {
  readonly primaryPath: string;

  constructor(primaryPath: string, options?: ErrorOptions) {
    super(`Unable to save the local Chemin document at ${primaryPath}`, options);
    this.name = 'WindowsPathFileWriteError';
    this.primaryPath = primaryPath;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function writeDurably(filePath: string, bytes: string): Promise<void> {
  const handle = await open(filePath, 'w');
  try {
    await handle.writeFile(bytes, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function decode(bytes: string): unknown {
  return JSON.parse(bytes) as unknown;
}

/**
 * Windows-local JSON adapter for the shared full-document repository.
 *
 * A save writes and flushes a temporary file before replacing the primary
 * document. When a primary document already exists, its previous bytes are
 * durably copied to a backup first. Exact temporary files are cleaned after a
 * failed attempt; the last durable primary remains the repository authority.
 */
export class NodePathFileAdapter implements PathRepositoryAdapter {
  readonly primaryPath: string;
  readonly backupPath: string;
  private readonly temporaryPath: string;
  private readonly backupTemporaryPath: string;
  private state: WindowsPathRecoveryState;

  constructor(primaryPath: string) {
    if (!path.isAbsolute(primaryPath)) throw new TypeError('The Windows Chemin path must be absolute');
    this.primaryPath = path.normalize(primaryPath);
    this.backupPath = `${this.primaryPath}.backup`;
    this.temporaryPath = `${this.primaryPath}.tmp`;
    this.backupTemporaryPath = `${this.backupPath}.tmp`;
    this.state = { source: 'empty', primaryPath: this.primaryPath, backupPath: this.backupPath };
  }

  get recoveryState(): WindowsPathRecoveryState {
    return { ...this.state };
  }

  async load(): Promise<unknown> {
    const primaryAvailable = await exists(this.primaryPath);
    const backupAvailable = await exists(this.backupPath);

    if (!primaryAvailable) {
      if (!backupAvailable) {
        this.state = { source: 'empty', primaryPath: this.primaryPath, backupPath: this.backupPath };
        return {};
      }
      try {
        const value = decode(await readFile(this.backupPath, 'utf8'));
        this.state = { source: 'backup', primaryPath: this.primaryPath, backupPath: this.backupPath };
        return value;
      } catch (error) {
        throw new WindowsPathFileReadError(this.primaryPath, true, { cause: error });
      }
    }

    try {
      const value = decode(await readFile(this.primaryPath, 'utf8'));
      this.state = { source: 'primary', primaryPath: this.primaryPath, backupPath: this.backupPath };
      return value;
    } catch (error) {
      throw new WindowsPathFileReadError(this.primaryPath, backupAvailable, { cause: error });
    }
  }

  async save(document: JsonObject): Promise<void> {
    const bytes = `${JSON.stringify(document, null, 2)}\n`;
    await mkdir(path.dirname(this.primaryPath), { recursive: true });

    try {
      await rm(this.temporaryPath, { force: true });
      await rm(this.backupTemporaryPath, { force: true });
      await writeDurably(this.temporaryPath, bytes);

      if (await exists(this.primaryPath)) {
        await copyFile(this.primaryPath, this.backupTemporaryPath);
        const backupHandle = await open(this.backupTemporaryPath, 'r+');
        try {
          await backupHandle.sync();
        } finally {
          await backupHandle.close();
        }
        await rm(this.backupPath, { force: true });
        await rename(this.backupTemporaryPath, this.backupPath);
      }

      await rename(this.temporaryPath, this.primaryPath);
      this.state = { source: 'primary', primaryPath: this.primaryPath, backupPath: this.backupPath };
    } catch (error) {
      await rm(this.temporaryPath, { force: true }).catch(() => undefined);
      await rm(this.backupTemporaryPath, { force: true }).catch(() => undefined);
      throw new WindowsPathFileWriteError(this.primaryPath, { cause: error });
    }
  }

  async restoreBackup(): Promise<void> {
    try {
      const bytes = await readFile(this.backupPath, 'utf8');
      decode(bytes);
      await mkdir(path.dirname(this.primaryPath), { recursive: true });
      await rm(this.temporaryPath, { force: true });
      await writeDurably(this.temporaryPath, bytes);
      await rename(this.temporaryPath, this.primaryPath);
      this.state = { source: 'primary', primaryPath: this.primaryPath, backupPath: this.backupPath };
    } catch (error) {
      await rm(this.temporaryPath, { force: true }).catch(() => undefined);
      throw new WindowsPathFileWriteError(this.primaryPath, { cause: error });
    }
  }
}
