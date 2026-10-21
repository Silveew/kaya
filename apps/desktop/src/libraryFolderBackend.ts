/**
 * Tauri implementation of the library folder backend.
 *
 * Calls the library_* commands in src-tauri/src/commands/library.rs and maps
 * their "code: message" errors back to FolderBackendError.
 */

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  FolderBackendError,
  type FolderBackend,
  type FolderBackendErrorCode,
  type FolderEntry,
  type FolderReadResult,
  type LibraryFolderAPI,
} from '@kaya/ui';

const CODES: FolderBackendErrorCode[] = ['exists', 'conflict', 'not-found', 'other'];

function toBackendError(error: unknown): FolderBackendError {
  const text = String(error);
  const colon = text.indexOf(':');
  const code = text.slice(0, colon) as FolderBackendErrorCode;
  if (colon > 0 && CODES.includes(code)) {
    return new FolderBackendError(code, text.slice(colon + 1).trim());
  }
  return new FolderBackendError('other', text);
}

async function call<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toBackendError(error);
  }
}

function createBackend(root: string): FolderBackend {
  return {
    scan: () => call<FolderEntry[]>('library_scan', { root }),
    read: path => call<FolderReadResult>('library_read', { root, path }),
    write: (path, content, options = {}) =>
      call<number>('library_write', {
        root,
        path,
        content,
        createNew: options.createNew ?? false,
        expectedMtime: options.expectedMtime ?? null,
      }),
    mkdir: path => call<void>('library_mkdir', { root, path }),
    rename: (from, to) => call<void>('library_rename', { root, from, to }),
    remove: path => call<void>('library_remove', { root, path }),
  };
}

async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === 'string' ? selected : null;
}

export const libraryFolderAPI: LibraryFolderAPI = { pickFolder, createBackend };
