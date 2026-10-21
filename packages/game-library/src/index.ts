/**
 * Library Storage Module
 *
 * Provides a unified interface for storing and managing SGF game files.
 */

export * from './types';
export * from './utils';
export { IndexedDBStorage } from './indexeddb-storage';
export { FolderStorage } from './folder-storage';
export * from './folder-backend';

import { IndexedDBStorage } from './indexeddb-storage';
import type { LibraryStorage } from './types';

// Singleton storage instance
let storageInstance: LibraryStorage | null = null;

/**
 * Get the library storage instance.
 * Creates a new instance if one doesn't exist.
 */
export function getLibraryStorage(): LibraryStorage {
  if (!storageInstance) {
    storageInstance = new IndexedDBStorage();
  }
  return storageInstance;
}

/**
 * Use a different storage, e.g. a FolderStorage on desktop.
 * Must be called before the library is initialized.
 */
export function setLibraryStorage(storage: LibraryStorage): void {
  storageInstance = storage;
}

/**
 * Initialize the library storage.
 * Should be called before using the storage.
 */
export async function initializeLibraryStorage(): Promise<void> {
  const storage = getLibraryStorage();
  await storage.initialize();
}
