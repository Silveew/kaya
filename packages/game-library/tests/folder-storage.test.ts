/**
 * Unit tests for @kaya/game-library FolderStorage
 *
 * The library folder holds the user's real files, so these run against a real
 * temporary directory through a node:fs backend that mirrors what the Rust
 * commands in the desktop app do. The cases are the ones that would lose or
 * hide data: external edits, renames carrying ids, name clashes with files
 * Kaya has not seen yet, and refusing to clear the folder.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as nodePath from 'node:path';
import JSZip from 'jszip';
import { FolderStorage } from '../src/folder-storage';
import {
  FolderBackendError,
  type FolderBackend,
  type FolderEntry,
  type FolderWriteOptions,
} from '../src/folder-backend';
import type { LibraryFile } from '../src/types';

// ============================================================================
// node:fs backend
// ============================================================================

function nodeBackend(root: string): FolderBackend {
  const abs = (path: string) => nodePath.join(root, ...path.split('/'));
  const mtimeOf = (path: string) => fs.statSync(abs(path)).mtimeMs;

  return {
    async scan() {
      const out: FolderEntry[] = [];
      const walk = (dir: string) => {
        for (const dirent of fs.readdirSync(abs(dir), { withFileTypes: true })) {
          if (dirent.name.startsWith('.')) continue;
          const path = dir ? `${dir}/${dirent.name}` : dirent.name;
          const stat = fs.statSync(abs(path));
          if (dirent.isDirectory()) {
            out.push({ path, type: 'folder', mtime: stat.mtimeMs, size: 0 });
            walk(path);
          } else if (dirent.name.toLowerCase().endsWith('.sgf')) {
            out.push({ path, type: 'file', mtime: stat.mtimeMs, size: stat.size });
          }
        }
      };
      walk('');
      return out;
    },
    async read(path) {
      if (!fs.existsSync(abs(path))) throw new FolderBackendError('not-found', path);
      return { content: fs.readFileSync(abs(path), 'utf8'), mtime: mtimeOf(path) };
    },
    async write(path, content, options: FolderWriteOptions = {}) {
      const exists = fs.existsSync(abs(path));
      if (options.createNew && exists) throw new FolderBackendError('exists', path);
      if (
        options.expectedMtime !== undefined &&
        exists &&
        mtimeOf(path) !== options.expectedMtime
      ) {
        throw new FolderBackendError('conflict', path);
      }
      const tmp = abs(path) + '.kaya-tmp';
      fs.writeFileSync(tmp, content);
      fs.renameSync(tmp, abs(path));
      return mtimeOf(path);
    },
    async mkdir(path) {
      if (fs.existsSync(abs(path))) throw new FolderBackendError('exists', path);
      fs.mkdirSync(abs(path));
    },
    async rename(from, to) {
      if (fs.existsSync(abs(to))) throw new FolderBackendError('exists', to);
      fs.renameSync(abs(from), abs(to));
    },
    async remove(path) {
      if (!fs.existsSync(abs(path))) throw new FolderBackendError('not-found', path);
      fs.rmSync(abs(path), { recursive: true });
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

function sgf(moves: string[] = ['B[aa]'], extra = ''): string {
  const body = moves.map(m => `;${m}`).join('');
  return `(;FF[4]GM[1]SZ[19]PB[Black]PW[White]${extra}${body})`;
}

let root: string;
let storage: FolderStorage;

function onDisk(path: string): string {
  return fs.readFileSync(nodePath.join(root, path), 'utf8');
}

function plant(path: string, content: string): void {
  const full = nodePath.join(root, path);
  fs.mkdirSync(nodePath.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

/** Bump a file's mtime as an external editor saving it would */
function touchLater(path: string): void {
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(nodePath.join(root, path), later, later);
}

async function names(): Promise<string[]> {
  const items = await storage.getAllItems();
  return items
    .map(item => {
      const parts = [item.name];
      let parentId = item.parentId;
      while (parentId) {
        const parent = items.find(i => i.id === parentId)!;
        parts.unshift(parent.name);
        parentId = parent.parentId;
      }
      return parts.join('/');
    })
    .sort();
}

beforeEach(async () => {
  root = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'kaya-folder-'));
  storage = new FolderStorage(root, nodeBackend(root));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

// ============================================================================
// Scanning
// ============================================================================

describe('scanning', () => {
  test('lists existing games and folders, skipping hidden entries and other files', async () => {
    plant('Games/one.sgf', sgf(['B[aa]'], 'GN[Jeroen]'));
    plant('root.SGF', sgf());
    plant('notes.txt', 'not a game');
    plant('.git/config', 'x');
    plant('.hidden.sgf', sgf());
    await storage.initialize();

    expect(await names()).toEqual(['Games', 'Games/one.sgf', 'root.SGF']);
    const one = (await storage.getAllItems()).find(i => i.name === 'one.sgf') as LibraryFile;
    expect(one.metadata.gameName).toBe('Jeroen');
    expect(one.content).toContain('GN[Jeroen]');
  });

  test('picks up files added, changed and removed outside Kaya', async () => {
    plant('a.sgf', sgf(['B[aa]']));
    plant('b.sgf', sgf());
    await storage.initialize();
    const before = await storage.getAllItems();
    const aId = before.find(i => i.name === 'a.sgf')!.id;

    plant('c.sgf', sgf());
    fs.rmSync(nodePath.join(root, 'b.sgf'));
    plant('a.sgf', sgf(['B[aa]', 'W[bb]', 'B[cc]']));
    touchLater('a.sgf');

    expect(await names()).toEqual(['a.sgf', 'c.sgf']);
    const a = (await storage.getItem(aId)) as LibraryFile;
    expect(a.metadata.moveCount).toBe(3);
  });

  test('ids are derived from the path, so they survive a restart', async () => {
    plant('Games/one.sgf', sgf());
    await storage.initialize();
    const first = (await storage.getAllItems()).map(i => i.id).sort();

    const again = new FolderStorage(root, nodeBackend(root));
    await again.initialize();
    expect((await again.getAllItems()).map(i => i.id).sort()).toEqual(first);
    expect(first).toContain('fs:Games/one.sgf');
  });

  test('getItem re-reads the file so an opened game is current', async () => {
    plant('a.sgf', sgf(['B[aa]']));
    await storage.initialize();
    const [a] = await storage.getAllItems();

    plant('a.sgf', sgf(['B[aa]', 'W[bb]']));
    touchLater('a.sgf');
    expect(((await storage.getItem(a.id)) as LibraryFile).content).toBe(sgf(['B[aa]', 'W[bb]']));
  });

  test('getItem returns null for a file deleted outside Kaya', async () => {
    plant('a.sgf', sgf());
    await storage.initialize();
    const [a] = await storage.getAllItems();
    fs.rmSync(nodePath.join(root, 'a.sgf'));
    expect(await storage.getItem(a.id)).toBe(null);
  });
});

// ============================================================================
// Writing
// ============================================================================

describe('files', () => {
  beforeEach(() => storage.initialize());

  test('creates a file on disk with a .sgf name', async () => {
    const content = sgf(['B[aa]'], 'GN[Title]');
    const created = await storage.createFile({ name: 'my game', content });
    expect(created.name).toBe('my game.sgf');
    expect(created.metadata.gameName).toBe('Title');
    expect(onDisk('my game.sgf')).toBe(content);
  });

  test('does not overwrite a file Kaya has not scanned yet', async () => {
    plant('game.sgf', sgf(['B[aa]']));
    const created = await storage.createFile({ name: 'game', content: sgf(['B[bb]']) });
    expect(created.name).toBe('game (1).sgf');
    expect(onDisk('game.sgf')).toBe(sgf(['B[aa]']));
  });

  test('rejects invalid SGF without touching the disk', async () => {
    await expect(storage.createFile({ name: 'x', content: 'hello' })).rejects.toThrow();
    expect(fs.readdirSync(root)).toEqual([]);
  });

  test('updates a file in place', async () => {
    const created = await storage.createFile({ name: 'g', content: sgf(['B[aa]']) });
    const updated = await storage.updateFile(created.id, sgf(['B[aa]', 'W[bb]']));
    expect(updated.metadata.moveCount).toBe(2);
    expect(onDisk('g.sgf')).toBe(sgf(['B[aa]', 'W[bb]']));
  });

  test('refuses to overwrite a file that changed on disk since Kaya last saw it', async () => {
    const created = await storage.createFile({ name: 'g', content: sgf(['B[aa]']) });
    plant('g.sgf', sgf(['B[cc]']));
    touchLater('g.sgf');

    await expect(storage.updateFile(created.id, sgf(['B[dd]']))).rejects.toThrow(/changed on disk/);
    expect(onDisk('g.sgf')).toBe(sgf(['B[cc]']));
  });

  test('creates files inside a folder', async () => {
    const folder = await storage.createFolder({ name: 'Games' });
    const created = await storage.createFile({
      name: 'x.sgf',
      content: sgf(),
      parentId: folder.id,
    });
    expect(created.parentId).toBe(folder.id);
    expect(onDisk('Games/x.sgf')).toBe(sgf());
    expect((await storage.getItems(folder.id)).map(i => i.name)).toEqual(['x.sgf']);
  });

  test('numbers a folder whose name is taken', async () => {
    await storage.createFolder({ name: 'Games' });
    const second = await storage.createFolder({ name: 'Games' });
    expect(second.name).toBe('Games (1)');
    expect(fs.existsSync(nodePath.join(root, 'Games (1)'))).toBe(true);
  });
});

describe('rename, move and delete', () => {
  beforeEach(() => storage.initialize());

  test('renaming keeps the id, so the loaded game keeps saving to it', async () => {
    const created = await storage.createFile({ name: 'old', content: sgf(['B[aa]']) });
    const renamed = await storage.renameItem({ itemId: created.id, newName: 'new' });
    expect(renamed.id).toBe(created.id);
    expect(renamed.name).toBe('new.sgf');
    expect(fs.existsSync(nodePath.join(root, 'old.sgf'))).toBe(false);

    await storage.updateFile(created.id, sgf(['B[bb]']));
    expect(onDisk('new.sgf')).toBe(sgf(['B[bb]']));
    expect(await names()).toEqual(['new.sgf']);
  });

  test('renaming a folder carries its contents', async () => {
    const folder = await storage.createFolder({ name: 'A' });
    const inner = await storage.createFile({ name: 'g', content: sgf(), parentId: folder.id });
    await storage.renameItem({ itemId: folder.id, newName: 'B' });

    expect(onDisk('B/g.sgf')).toBe(sgf());
    const item = await storage.getItem(inner.id);
    expect(item?.parentId).toBe(folder.id);
    expect(await names()).toEqual(['B', 'B/g.sgf']);
  });

  test('moves a file between folders, numbering on a clash', async () => {
    const dest = await storage.createFolder({ name: 'Dest' });
    await storage.createFile({ name: 'g', content: sgf(['B[aa]']), parentId: dest.id });
    const moving = await storage.createFile({ name: 'g', content: sgf(['B[bb]']) });

    const moved = await storage.moveItem({ itemId: moving.id, newParentId: dest.id });
    expect(moved.name).toBe('g (1).sgf');
    expect(moved.parentId).toBe(dest.id);
    expect(onDisk('Dest/g (1).sgf')).toBe(sgf(['B[bb]']));
  });

  test('will not move a folder into itself', async () => {
    const outer = await storage.createFolder({ name: 'Outer' });
    const inner = await storage.createFolder({ name: 'Inner', parentId: outer.id });
    await expect(storage.moveItem({ itemId: outer.id, newParentId: inner.id })).rejects.toThrow();
  });

  test('deletes a folder with its contents', async () => {
    const folder = await storage.createFolder({ name: 'A' });
    const inner = await storage.createFile({ name: 'g', content: sgf(), parentId: folder.id });
    await storage.deleteItem(folder.id);

    expect(fs.existsSync(nodePath.join(root, 'A'))).toBe(false);
    expect(await storage.getItem(inner.id)).toBe(null);
    expect(await names()).toEqual([]);
  });

  test('clear() refuses and leaves the folder alone', async () => {
    await storage.createFile({ name: 'g', content: sgf() });
    await expect(storage.clear()).rejects.toThrow();
    expect(onDisk('g.sgf')).toBe(sgf());
  });
});

describe('zip and stats', () => {
  beforeEach(() => storage.initialize());

  test('imports a zip into real folders and exports it back', async () => {
    const zip = new JSZip();
    zip.file('Games/a.sgf', sgf(['B[aa]']));
    zip.file('b.sgf', sgf(['B[bb]']));
    const data = await zip.generateAsync({ type: 'arraybuffer' });

    const result = await storage.importZip(data);
    expect(result.imported).toBe(2);
    expect(onDisk('Games/a.sgf')).toBe(sgf(['B[aa]']));

    const exported = await storage.exportZip();
    const back = await JSZip.loadAsync(await exported.data!.arrayBuffer());
    expect(await back.file('Games/a.sgf')!.async('string')).toBe(sgf(['B[aa]']));
    expect(await back.file('b.sgf')!.async('string')).toBe(sgf(['B[bb]']));
  });

  test('counts files, folders and bytes', async () => {
    const folder = await storage.createFolder({ name: 'A' });
    await storage.createFile({ name: 'g', content: sgf(), parentId: folder.id });
    expect(await storage.getStats()).toEqual({
      totalFiles: 1,
      totalFolders: 1,
      totalSize: new Blob([sgf()]).size,
    });
  });
});
