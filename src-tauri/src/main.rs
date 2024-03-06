#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct Range {
    pub start: f64,
    pub end: f64,
}

#[serde(rename_all = "camelCase")]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct AnnotationData {
    pub file_path: String,
    pub entire: Range,
    pub point: Range,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct Label {
    pub file: String,
    pub entire: Range,
    pub point: Range,
}

use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use std::process::Command;

#[tauri::command]
fn open_save_root_dir(app_handle: tauri::AppHandle) -> () {
    let binding = app_handle.path_resolver().app_data_dir().unwrap();
    let app_data_dir = binding.to_str().unwrap();

    let save_root_dir = Path::new(app_data_dir).join("sound-annotation");
    let dir = save_root_dir.to_str().unwrap().to_string();

    Command::new("explorer")
        .arg(dir)
        .spawn()
        .expect("failed to open file explorer");
}

#[tauri::command]
fn annotate(app_handle: tauri::AppHandle, annotation_data: AnnotationData) -> () {
    let binding = app_handle.path_resolver().app_data_dir().unwrap();
    let app_data_dir = binding.to_str().unwrap();

    let save_root_dir = Path::new(app_data_dir).join("sound-annotation");

    let file_name_without_ext = uuid::Uuid::new_v4().to_string();

    let ext = Path::new(&annotation_data.file_path)
        .extension()
        .unwrap()
        .to_str()
        .unwrap()
        .to_lowercase();

    // annotation_data.file_path からファイルをコピー
    let copied_file_name = format!("{}.{}", file_name_without_ext, ext);
    let copied_file_path = save_root_dir.join(&copied_file_name);

    let label = Label {
        file: copied_file_name,
        entire: annotation_data.entire,
        point: annotation_data.point,
    };

    // 1. labels.jsonl ファイルがなければ作成
    // 2. labels.jsonl ファイルに label を追記
    let labels_file = save_root_dir.join("labels.jsonl");

    std::fs::create_dir_all(&save_root_dir).unwrap();

    let mut labels_file = OpenOptions::new()
        .write(true)
        .append(true)
        .create(true)
        .open(labels_file)
        .unwrap();

    writeln!(labels_file, "{}", serde_json::to_string(&label).unwrap()).unwrap();

    std::fs::copy(&annotation_data.file_path, &copied_file_path).unwrap();
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_save_root_dir, annotate])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
