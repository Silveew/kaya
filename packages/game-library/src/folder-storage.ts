/**
 * Folder Storage Implementation
 *
 * Keeps the library as plain .sgf files in a folder on disk, so games can be
 * versioned with git, synced, or opened by other tools. The folder is the
 * source of truth: every getAllItems() rescans it, so changes made outside
 * Kaya show up on the next refresh.
 *
 * Item ids stay stable for the whole session, also across renames and moves,
 * because callers (the loaded file, the selection) hold on to them. A freshly
 * scanned item gets the id "fs:<path>", which also survives an app restart.
 */

import type {
  LibraryStorage,
  LibraryItem,
  LibraryFile,
  LibraryFolder,
  LibraryItemId,
  CreateFileOptions,
  CreateFolderOptions,
  MoveItemOptions,
  RenameItemOptions,
  ImportResult,
  ExportResult,
  LibraryStats,
  SGFMetadata,
} from './types';
import {
  generateId,
  extractSGFMetadata,
  isValidSGF,
  sanitizeFilename,
  ensureSGFExtension,
  makeUniqueName,
} from './utils';
import { FolderBackendError, type FolderBackend, type FolderEntry } from './folder-backend';
import { importZipToStorage, exportStorageToZip } from './indexeddb-zip-operations';

interface Entry {
  id: LibraryItemId;
  type: 'file' | 'folder';
  path: string;
  mtime: number;
  size: number;
  content?: string;
  metadata?: SGFMetadata;
}

/** How many numbered names to try before giving up on a create */
const MAX_NAME_ATTEMPTS = 100;

export class FolderStorage implements LibraryStorage {
  private entries = new Map<LibraryItemId, Entry>();
  private pathToId = new Map<string, LibraryItemId>();
  private initialized = false;
  /** Serializes operations so a rescan never interleaves with a write */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    /** Absolute path of the library folder, for display */
    public readonly rootPath: string,
    private readonly backend: FolderBackend
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.serial(() => this.rescan());
    this.initialized = true;
  }

  async getItems(parentId: LibraryItemId | null = null): Promise<LibraryItem[]> {
    return this.serial(async () =>
      [...this.entries.values()]
        .filter(entry => this.parentIdOf(entry) === parentId)
        .map(entry => this.toItem(entry))
        .sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
    );
  }

  async getAllItems(): Promise<LibraryItem[]> {
    return this.serial(async () => {
      await this.rescan();
      return [...this.entries.values()].map(entry => this.toItem(entry));
    });
  }

  async getItem(id: LibraryItemId): Promise<LibraryItem | null> {
    return this.serial(async () => {
      const entry = this.entries.get(id);
      if (!entry) return null;
      if (entry.type === 'file') {
        // Re-read so opening a game always shows what is on disk now.
        try {
          await this.load(entry);
        } catch (error) {
          if (error instanceof FolderBackendError && error.code === 'not-found') {
            this.forget(entry);
            return null;
          }
          throw error;
        }
      }
      return this.toItem(entry);
    });
  }

  async createFile(options: CreateFileOptions): Promise<LibraryFile> {
    const { name, content, parentId = null } = options;
    if (!isValidSGF(content)) {
      throw new Error('Invalid SGF content');
    }

    return this.serial(async () => {
      const dir = this.folderPath(parentId);
      const desired = ensureSGFExtension(sanitizeFilename(name));
      const fileName = await this.claimName(dir, desired, async path => {
        const mtime = await this.backend.write(path, content, { createNew: true });
        this.remember({
          id: this.newId(path),
          type: 'file',
          path,
          mtime,
          size: byteLength(content),
          content,
          metadata: extractSGFMetadata(content),
        });
      });
      return this.toItem(this.entries.get(this.pathToId.get(join(dir, fileName))!)!) as LibraryFile;
    });
  }

  async createFolder(options: CreateFolderOptions): Promise<LibraryFolder> {
    const { name, parentId = null } = options;

    return this.serial(async () => {
      const dir = this.folderPath(parentId);
      const folderName = await this.claimName(dir, sanitizeFilename(name), async path => {
        await this.backend.mkdir(path);
        this.remember({ id: this.newId(path), type: 'folder', path, mtime: Date.now(), size: 0 });
      });
      return this.toItem(
        this.entries.get(this.pathToId.get(join(dir, folderName))!)!
      ) as LibraryFolder;
    });
  }

  async updateFile(id: LibraryItemId, content: string): Promise<LibraryFile> {
    if (!isValidSGF(content)) {
      throw new Error('Invalid SGF content');
    }

    return this.serial(async () => {
      const entry = this.entries.get(id);
      if (!entry || entry.type !== 'file') {
        throw new Error('File not found');
      }

      let mtime: number;
      try {
        mtime = await this.backend.write(entry.path, content, { expectedMtime: entry.mtime });
      } catch (error) {
        if (error instanceof FolderBackendError && error.code === 'conflict') {
          throw new Error(
            `"${entry.path}" was changed on disk outside Kaya. Reopen it from the library, or save under a new name.`
          );
        }
        throw error;
      }

      entry.mtime = mtime;
      entry.content = content;
      entry.size = byteLength(content);
      entry.metadata = extractSGFMetadata(content);
      return this.toItem(entry) as LibraryFile;
    });
  }

  async renameItem(options: RenameItemOptions): Promise<LibraryItem> {
    const { itemId, newName } = options;

    return this.serial(async () => {
      const entry = this.entries.get(itemId);
      if (!entry) {
        throw new Error('Item not found');
      }

      let name = sanitizeFilename(newName);
      if (entry.type === 'file') {
        name = ensureSGFExtension(name);
      }
      const dir = parentPath(entry.path);
      const siblings = this.childrenOf(dir).map(sibling => this.toItem(sibling));
      const uniqueName = makeUniqueName(name, siblings, itemId);
      await this.relocate(entry, join(dir, uniqueName));
      return this.toItem(entry);
    });
  }

  async moveItem(options: MoveItemOptions): Promise<LibraryItem> {
    const { itemId, newParentId } = options;

    return this.serial(async () => {
      const entry = this.entries.get(itemId);
      if (!entry) {
        throw new Error('Item not found');
      }

      const dir = this.folderPath(newParentId);
      if (entry.type === 'folder' && (dir === entry.path || dir.startsWith(entry.path + '/'))) {
        throw new Error('Cannot move a folder into its own descendant');
      }

      const name = baseName(entry.path);
      const siblings = this.childrenOf(dir).map(sibling => this.toItem(sibling));
      const uniqueName = makeUniqueName(name, siblings, itemId);
      await this.relocate(entry, join(dir, uniqueName));
      return this.toItem(entry);
    });
  }

  async deleteItem(id: LibraryItemId): Promise<void> {
    return this.serial(async () => {
      const entry = this.entries.get(id);
      if (!entry) return;

      try {
        await this.backend.remove(entry.path);
      } catch (error) {
        if (!(error instanceof FolderBackendError && error.code === 'not-found')) {
          throw error;
        }
      }

      for (const other of [...this.entries.values()]) {
        if (other.path === entry.path || other.path.startsWith(entry.path + '/')) {
          this.forget(other);
        }
      }
    });
  }

  async importZip(data: ArrayBuffer): Promise<ImportResult> {
    return importZipToStorage(data, this);
  }

  async exportZip(): Promise<ExportResult> {
    return exportStorageToZip(this);
  }

  async getStats(): Promise<LibraryStats> {
    return this.serial(async () => {
      let totalFiles = 0;
      let totalFolders = 0;
      let totalSize = 0;
      for (const entry of this.entries.values()) {
        if (entry.type === 'file') {
          totalFiles++;
          totalSize += entry.size;
        } else {
          totalFolders++;
        }
      }
      return { totalFiles, totalFolders, totalSize };
    });
  }

  /**
   * Refuse to empty the folder. "Clear library" in app storage only drops
   * Kaya's own copies; here it would delete the user's real files.
   */
  async clear(): Promise<void> {
    throw new Error(
      'Clearing is disabled for a library folder. Delete files in the folder itself if you mean to.'
    );
  }

  // Private helpers

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(operation, operation);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Bring the in-memory index in line with the folder */
  private async rescan(): Promise<void> {
    const found: FolderEntry[] = await this.backend.scan();
    const seen = new Set<string>();

    for (const item of found) {
      seen.add(item.path);
      const existingId = this.pathToId.get(item.path);
      const existing = existingId ? this.entries.get(existingId) : undefined;

      if (existing && existing.type === item.type) {
        if (
          item.type === 'file' &&
          (existing.mtime !== item.mtime || existing.size !== item.size)
        ) {
          existing.content = undefined;
        }
        existing.mtime = item.mtime;
        existing.size = item.size;
      } else {
        if (existing) this.forget(existing);
        this.remember({
          id: this.newId(item.path),
          type: item.type,
          path: item.path,
          mtime: item.mtime,
          size: item.size,
        });
      }
    }

    for (const entry of [...this.entries.values()]) {
      if (!seen.has(entry.path)) {
        this.forget(entry);
      }
    }

    for (const entry of this.entries.values()) {
      if (entry.type === 'file' && entry.content === undefined) {
        try {
          await this.load(entry);
        } catch (error) {
          // Vanished between scan and read; the next scan drops it.
          console.warn(`Could not read ${entry.path}:`, error);
          entry.content = '';
          entry.metadata = {};
        }
      }
    }
  }

  private async load(entry: Entry): Promise<void> {
    const { content, mtime } = await this.backend.read(entry.path);
    entry.content = content;
    entry.mtime = mtime;
    entry.size = byteLength(content);
    entry.metadata = extractSGFMetadata(content);
  }

  /**
   * Find a free name in `dir`, starting from `desired`, and hand its path to
   * `create`. Names already on disk but not yet scanned are caught by the
   * backend reporting "exists", which moves on to the next number.
   */
  private async claimName(
    dir: string,
    desired: string,
    create: (path: string) => Promise<void>
  ): Promise<string> {
    const taken = this.childrenOf(dir).map(child => ({ name: baseName(child.path), id: child.id }));

    for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
      const name = makeUniqueName(desired, taken);
      try {
        await create(join(dir, name));
        return name;
      } catch (error) {
        if (error instanceof FolderBackendError && error.code === 'exists') {
          taken.push({ name, id: `taken-${attempt}` });
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Could not find a free name for "${desired}"`);
  }

  /** Rename on disk and carry the entry (and a folder's contents) along */
  private async relocate(entry: Entry, newPath: string): Promise<void> {
    if (newPath === entry.path) return;
    await this.backend.rename(entry.path, newPath);

    const oldPath = entry.path;
    for (const other of [...this.entries.values()]) {
      if (other.path === oldPath || other.path.startsWith(oldPath + '/')) {
        this.pathToId.delete(other.path);
        other.path = newPath + other.path.slice(oldPath.length);
        this.pathToId.set(other.path, other.id);
      }
    }
  }

  private newId(path: string): LibraryItemId {
    const id = `fs:${path}`;
    return this.entries.has(id) ? generateId() : id;
  }

  private remember(entry: Entry): void {
    this.entries.set(entry.id, entry);
    this.pathToId.set(entry.path, entry.id);
  }

  private forget(entry: Entry): void {
    this.entries.delete(entry.id);
    if (this.pathToId.get(entry.path) === entry.id) {
      this.pathToId.delete(entry.path);
    }
  }

  private folderPath(folderId: LibraryItemId | null): string {
    if (folderId === null) return '';
    const folder = this.entries.get(folderId);
    if (!folder || folder.type !== 'folder') {
      throw new Error('Folder not found');
    }
    return folder.path;
  }

  private childrenOf(dir: string): Entry[] {
    return [...this.entries.values()].filter(entry => parentPath(entry.path) === dir);
  }

  private parentIdOf(entry: Entry): LibraryItemId | null {
    const dir = parentPath(entry.path);
    return dir === '' ? null : (this.pathToId.get(dir) ?? null);
  }

  private toItem(entry: Entry): LibraryItem {
    const base = {
      id: entry.id,
      name: baseName(entry.path),
      parentId: this.parentIdOf(entry),
      createdAt: entry.mtime,
      updatedAt: entry.mtime,
    };
    if (entry.type === 'folder') {
      return { ...base, type: 'folder', itemCount: this.childrenOf(entry.path).length };
    }
    return {
      ...base,
      type: 'file',
      content: entry.content ?? '',
      metadata: entry.metadata ?? {},
      size: entry.size,
    };
  }
}

function join(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(0, slash) : '';
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function byteLength(content: string): number {
  return new TextEncoder().encode(content).length;
}
