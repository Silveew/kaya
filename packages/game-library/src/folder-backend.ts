/**
 * Folder Backend
 *
 * The file system operations FolderStorage needs, kept platform-free so the
 * package does not depend on Tauri. The desktop app injects an implementation
 * backed by Rust commands; tests use an in-memory one.
 *
 * Every path is relative to the library root and uses "/" as separator.
 */

/** One entry found while scanning the library folder */
export interface FolderEntry {
  /** Path relative to the root, "/"-separated */
  path: string;
  type: 'file' | 'folder';
  /** Last modification time in milliseconds */
  mtime: number;
  /** Size in bytes (0 for folders) */
  size: number;
}

/** Result of reading a file */
export interface FolderReadResult {
  content: string;
  mtime: number;
}

/** Options for writing a file */
export interface FolderWriteOptions {
  /** Fail with a "exists" error if the file is already there */
  createNew?: boolean;
  /**
   * Fail with a "conflict" error if the file on disk no longer has this
   * modification time, i.e. something outside Kaya changed it.
   */
  expectedMtime?: number;
}

/** Error codes a backend reports through FolderBackendError */
export type FolderBackendErrorCode = 'exists' | 'conflict' | 'not-found' | 'other';

export class FolderBackendError extends Error {
  constructor(
    public readonly code: FolderBackendErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'FolderBackendError';
  }
}

export interface FolderBackend {
  /**
   * List every folder and .sgf file below the root, recursively.
   * Hidden entries (starting with ".") are skipped, so a .git folder never shows up.
   */
  scan(): Promise<FolderEntry[]>;
  read(path: string): Promise<FolderReadResult>;
  /** Write a file atomically and return its new modification time */
  write(path: string, content: string, options?: FolderWriteOptions): Promise<number>;
  /** Create a folder; fails with "exists" if it is already there */
  mkdir(path: string): Promise<void>;
  /** Rename or move; fails with "exists" if the destination is taken */
  rename(from: string, to: string): Promise<void>;
  /** Remove a file, or a folder with everything in it */
  remove(path: string): Promise<void>;
}
