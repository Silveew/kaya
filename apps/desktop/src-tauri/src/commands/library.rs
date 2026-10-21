//! File system commands behind the "library folder" storage
//! (packages/game-library/src/folder-storage.ts).
//!
//! Every command takes the library root plus a "/"-separated path relative to
//! it. Paths that would leave the root are rejected, so a broken or hostile
//! frontend call cannot touch anything else. These run as plain commands
//! rather than through the fs plugin because the plugin's scope cannot be
//! granted for a folder the user picked in an earlier session.
//!
//! Errors are strings prefixed with a code the frontend maps back to
//! FolderBackendError: "exists:", "conflict:", "not-found:" or "other:".

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize)]
pub struct LibraryEntry {
    pub path: String,
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub mtime: f64,
    pub size: u64,
}

#[derive(Debug, Serialize)]
pub struct LibraryReadResult {
    pub content: String,
    pub mtime: f64,
}

fn err(code: &str, message: impl std::fmt::Display) -> String {
    format!("{}: {}", code, message)
}

fn io_err(error: std::io::Error, path: &str) -> String {
    match error.kind() {
        std::io::ErrorKind::NotFound => err("not-found", path),
        std::io::ErrorKind::AlreadyExists => err("exists", path),
        _ => err("other", format!("{}: {}", path, error)),
    }
}

/// Resolve `rel` inside `root`, refusing anything that could escape it
fn resolve(root: &str, rel: &str) -> Result<PathBuf, String> {
    let root = Path::new(root);
    if !root.is_absolute() {
        return Err(err("other", "library root must be an absolute path"));
    }
    if rel.is_empty() {
        return Err(err("other", "empty path"));
    }
    let mut out = root.to_path_buf();
    for part in rel.split('/') {
        let component = Path::new(part).components().collect::<Vec<_>>();
        match component.as_slice() {
            [Component::Normal(name)] if !part.starts_with('.') => out.push(name),
            _ => return Err(err("other", format!("invalid path: {}", rel))),
        }
    }
    Ok(out)
}

fn mtime_ms(meta: &fs::Metadata) -> f64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs_f64() * 1000.0)
        .unwrap_or(0.0)
}

fn is_sgf(name: &str) -> bool {
    name.to_ascii_lowercase().ends_with(".sgf")
}

fn scan_dir(dir: &Path, prefix: &str, out: &mut Vec<LibraryEntry>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| io_err(e, prefix))?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let rel = if prefix.is_empty() { name.clone() } else { format!("{}/{}", prefix, name) };
        // metadata() follows symlinks, so a linked folder of games still shows up
        let Ok(meta) = fs::metadata(entry.path()) else { continue };
        if meta.is_dir() {
            out.push(LibraryEntry { path: rel.clone(), kind: "folder", mtime: mtime_ms(&meta), size: 0 });
            scan_dir(&entry.path(), &rel, out)?;
        } else if meta.is_file() && is_sgf(&name) {
            out.push(LibraryEntry { path: rel, kind: "file", mtime: mtime_ms(&meta), size: meta.len() });
        }
    }
    Ok(())
}

pub fn scan(root: &str) -> Result<Vec<LibraryEntry>, String> {
    let root_path = Path::new(root);
    if !root_path.is_dir() {
        return Err(err("not-found", format!("library folder {} does not exist", root)));
    }
    let mut out = Vec::new();
    scan_dir(root_path, "", &mut out)?;
    Ok(out)
}

pub fn read(root: &str, path: &str) -> Result<LibraryReadResult, String> {
    let full = resolve(root, path)?;
    let content = fs::read_to_string(&full).map_err(|e| io_err(e, path))?;
    let meta = fs::metadata(&full).map_err(|e| io_err(e, path))?;
    Ok(LibraryReadResult { content, mtime: mtime_ms(&meta) })
}

pub fn write(
    root: &str,
    path: &str,
    content: &str,
    create_new: bool,
    expected_mtime: Option<f64>,
) -> Result<f64, String> {
    let full = resolve(root, path)?;
    match fs::metadata(&full) {
        Ok(meta) => {
            if create_new {
                return Err(err("exists", path));
            }
            if let Some(expected) = expected_mtime {
                // Sub-millisecond noise from float conversion is not a change
                if (mtime_ms(&meta) - expected).abs() > 1.0 {
                    return Err(err("conflict", path));
                }
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(io_err(e, path)),
    }

    // Write next to the target and rename over it, so a crash or a full disk
    // never leaves a half-written game behind.
    let file_name = full.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let tmp = full.with_file_name(format!(".{}.kaya-tmp", file_name));
    let result = (|| {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(content.as_bytes())?;
        file.sync_all()?;
        fs::rename(&tmp, &full)
    })();
    if let Err(e) = result {
        let _ = fs::remove_file(&tmp);
        return Err(io_err(e, path));
    }

    let meta = fs::metadata(&full).map_err(|e| io_err(e, path))?;
    Ok(mtime_ms(&meta))
}

pub fn mkdir(root: &str, path: &str) -> Result<(), String> {
    let full = resolve(root, path)?;
    fs::create_dir(&full).map_err(|e| io_err(e, path))
}

pub fn rename(root: &str, from: &str, to: &str) -> Result<(), String> {
    let source = resolve(root, from)?;
    let dest = resolve(root, to)?;
    // A case-only rename on a case-insensitive disk sees its own source as the
    // destination; that one is fine, anything else already there is not.
    if dest.exists() && !from.eq_ignore_ascii_case(to) {
        return Err(err("exists", to));
    }
    fs::rename(&source, &dest).map_err(|e| io_err(e, from))
}

pub fn remove(root: &str, path: &str) -> Result<(), String> {
    let full = resolve(root, path)?;
    let meta = fs::symlink_metadata(&full).map_err(|e| io_err(e, path))?;
    if meta.is_dir() {
        fs::remove_dir_all(&full).map_err(|e| io_err(e, path))
    } else {
        fs::remove_file(&full).map_err(|e| io_err(e, path))
    }
}

async fn blocking<T: Send + 'static>(
    job: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tokio::task::spawn_blocking(job)
        .await
        .map_err(|e| err("other", format!("task failed: {}", e)))?
}

#[tauri::command]
pub async fn library_scan(root: String) -> Result<Vec<LibraryEntry>, String> {
    blocking(move || scan(&root)).await
}

#[tauri::command]
pub async fn library_read(root: String, path: String) -> Result<LibraryReadResult, String> {
    blocking(move || read(&root, &path)).await
}

#[tauri::command]
pub async fn library_write(
    root: String,
    path: String,
    content: String,
    create_new: bool,
    expected_mtime: Option<f64>,
) -> Result<f64, String> {
    blocking(move || write(&root, &path, &content, create_new, expected_mtime)).await
}

#[tauri::command]
pub async fn library_mkdir(root: String, path: String) -> Result<(), String> {
    blocking(move || mkdir(&root, &path)).await
}

#[tauri::command]
pub async fn library_rename(root: String, from: String, to: String) -> Result<(), String> {
    blocking(move || rename(&root, &from, &to)).await
}

#[tauri::command]
pub async fn library_remove(root: String, path: String) -> Result<(), String> {
    blocking(move || remove(&root, &path)).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> String {
        let dir = std::env::temp_dir().join(format!("kaya-lib-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir.to_string_lossy().to_string()
    }

    #[test]
    fn rejects_paths_that_escape_the_root() {
        let root = temp_root("escape");
        for bad in ["../x.sgf", "a/../../x.sgf", "/etc/passwd", "", "a//b.sgf", ".git/config", "./a.sgf"] {
            assert!(resolve(&root, bad).is_err(), "{} should be rejected", bad);
        }
        assert!(resolve(&root, "Games/one.sgf").is_ok());
        assert!(resolve("relative/root", "a.sgf").is_err());
    }

    #[test]
    fn scans_folders_and_sgf_files_only() {
        let root = temp_root("scan");
        fs::create_dir_all(Path::new(&root).join("Games")).unwrap();
        fs::create_dir_all(Path::new(&root).join(".git")).unwrap();
        fs::write(Path::new(&root).join("Games/a.sgf"), "(;)").unwrap();
        fs::write(Path::new(&root).join("notes.txt"), "x").unwrap();
        fs::write(Path::new(&root).join(".hidden.sgf"), "(;)").unwrap();

        let mut paths: Vec<_> = scan(&root).unwrap().into_iter().map(|e| (e.path, e.kind)).collect();
        paths.sort();
        assert_eq!(paths, vec![("Games".to_string(), "folder"), ("Games/a.sgf".to_string(), "file")]);
    }

    #[test]
    fn write_respects_create_new_and_conflicts() {
        let root = temp_root("write");
        let mtime = write(&root, "a.sgf", "(;B[aa])", true, None).unwrap();
        assert!(write(&root, "a.sgf", "(;)", true, None).unwrap_err().starts_with("exists:"));

        let mtime2 = write(&root, "a.sgf", "(;B[bb])", false, Some(mtime)).unwrap();
        assert_eq!(read(&root, "a.sgf").unwrap().content, "(;B[bb])");

        let stale = mtime2 - 10_000.0;
        assert!(write(&root, "a.sgf", "(;)", false, Some(stale)).unwrap_err().starts_with("conflict:"));
        assert_eq!(read(&root, "a.sgf").unwrap().content, "(;B[bb])");
        assert!(!Path::new(&root).join(".a.sgf.kaya-tmp").exists());
    }

    #[test]
    fn rename_mkdir_and_remove() {
        let root = temp_root("ops");
        mkdir(&root, "A").unwrap();
        assert!(mkdir(&root, "A").unwrap_err().starts_with("exists:"));
        write(&root, "A/g.sgf", "(;)", true, None).unwrap();
        write(&root, "b.sgf", "(;)", true, None).unwrap();

        assert!(rename(&root, "b.sgf", "A/g.sgf").unwrap_err().starts_with("exists:"));
        rename(&root, "A", "B").unwrap();
        assert_eq!(read(&root, "B/g.sgf").unwrap().content, "(;)");
        rename(&root, "b.sgf", "B.SGF").unwrap();

        remove(&root, "B").unwrap();
        assert!(!Path::new(&root).join("B").exists());
        assert!(remove(&root, "B").unwrap_err().starts_with("not-found:"));
    }
}
