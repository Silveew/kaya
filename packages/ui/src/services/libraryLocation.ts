/**
 * Library location
 *
 * Where the game library lives: Kaya's own app storage (IndexedDB, the
 * default) or a folder on disk the user picked. A folder needs native file
 * access, so the desktop app injects it with setLibraryFolderAPI(); without
 * it, the option is simply not offered.
 *
 * The choice takes effect at startup: applyLibraryLocation() runs before the
 * library initializes, and switching reloads the window.
 */

import { FolderStorage, setLibraryStorage, type FolderBackend } from '@kaya/game-library';

export interface LibraryFolderAPI {
  /** Show a native folder picker; null when cancelled */
  pickFolder: () => Promise<string | null>;
  /** File operations rooted at the given absolute folder path */
  createBackend: (root: string) => FolderBackend;
}

const LIBRARY_FOLDER_KEY = 'kaya-library-folder';
const LOADED_FILE_ID_KEY = 'kaya-library-loaded-file-id';

let folderAPI: LibraryFolderAPI | null = null;
let activeFolder: string | null = null;

/** Called by the desktop app on startup */
export function setLibraryFolderAPI(api: LibraryFolderAPI): void {
  folderAPI = api;
}

/** Can this platform keep the library in a folder? */
export function isLibraryFolderSupported(): boolean {
  return folderAPI !== null;
}

/** The folder the library is using right now, or null for app storage */
export function getActiveLibraryFolder(): string | null {
  return activeFolder;
}

function readSavedFolder(): string | null {
  try {
    return localStorage.getItem(LIBRARY_FOLDER_KEY);
  } catch {
    return null;
  }
}

/** Install the storage for the saved location. Call before the library initializes. */
export function applyLibraryLocation(): void {
  const folder = readSavedFolder();
  if (!folder || !folderAPI) return;
  setLibraryStorage(new FolderStorage(folder, folderAPI.createBackend(folder)));
  activeFolder = folder;
}

/** Ask for a folder; returns it, or null when cancelled */
export async function pickLibraryFolder(): Promise<string | null> {
  if (!folderAPI) return null;
  return folderAPI.pickFolder();
}

/**
 * Remember a new location (null = app storage) and reload so the library
 * starts over on it. Ids from one storage mean nothing in the other, so the
 * loaded-file pointer is dropped as well.
 */
export function switchLibraryLocation(folder: string | null): void {
  try {
    if (folder) {
      localStorage.setItem(LIBRARY_FOLDER_KEY, folder);
    } else {
      localStorage.removeItem(LIBRARY_FOLDER_KEY);
    }
    localStorage.removeItem(LOADED_FILE_ID_KEY);
  } catch {
    // Without storage the choice cannot persist; reloading would just undo it.
    return;
  }
  window.location.reload();
}
